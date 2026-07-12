import asyncio
import os
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

import azure.cognitiveservices.speech as speechsdk

from aa_mock.aa_service import create_consent, fetch_fi_data
from audit import recent_audit_logs
from config import (
    SPEECH_KEY, SPEECH_REGION, TAVUS_API_KEY, TAVUS_REPLICA_ID, TAVUS_WEBHOOK_BASE_URL,
)
from engines.scenario import run as run_scenario
from engines.suitability import run as run_suitability
from engines.unification import build_twin_state
from orchestrator import run_advisor_turn
from recommendations_store import persist_recommendations
from tavus import TavusClient, TavusError
from turn_store import TurnStore
from twin_data import default_customer_id, get_goals

AVATAR_DIR = os.path.join(os.path.dirname(__file__), "..", "avatar")

tavus_client: TavusClient | None = None
turn_store: TurnStore | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global tavus_client, turn_store
    turn_store = TurnStore(max_age=1800.0)
    if TAVUS_API_KEY:
        tavus_client = TavusClient()
    yield
    turn_store = None
    tavus_client = None


app = FastAPI(title="MIA Wealth backend", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)


@app.get("/")
async def root():
    return FileResponse(os.path.join(AVATAR_DIR, "index.html"))


@app.get("/avatar-legacy")
async def root_legacy():
    return FileResponse(os.path.join(AVATAR_DIR, "index_legacy.html"))


@app.get("/ice-token")
async def ice_token():
    url = f"https://{SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/avatar/relay/token/v1"
    async with httpx.AsyncClient(timeout=10) as hc:
        resp = await hc.get(url, headers={"Ocp-Apim-Subscription-Key": SPEECH_KEY})
    if resp.status_code != 200:
        return JSONResponse({"error": "Failed to get ICE token", "detail": resp.text}, status_code=502)
    data = resp.json()
    data["speech_key"] = SPEECH_KEY
    data["speech_region"] = SPEECH_REGION
    return JSONResponse(data)


@app.websocket("/stt-ws")
async def stt_ws(websocket: WebSocket):
    await websocket.accept()
    loop = asyncio.get_running_loop()
    msg_queue: asyncio.Queue = asyncio.Queue()

    push_stream = speechsdk.audio.PushAudioInputStream()
    audio_config = speechsdk.audio.AudioConfig(stream=push_stream)
    speech_config = speechsdk.SpeechConfig(subscription=SPEECH_KEY, region=SPEECH_REGION)
    speech_config.set_property(speechsdk.PropertyId.SpeechServiceConnection_LanguageIdMode, "Continuous")
    auto_detect = speechsdk.languageconfig.AutoDetectSourceLanguageConfig(languages=["en-IN", "hi-IN"])
    recognizer = speechsdk.SpeechRecognizer(
        speech_config=speech_config, auto_detect_source_language_config=auto_detect, audio_config=audio_config,
    )

    finals: list[str] = []

    def on_recognizing(evt):
        asyncio.run_coroutine_threadsafe(msg_queue.put({"type": "partial", "text": evt.result.text}), loop)

    def on_recognized(evt):
        if evt.result.reason == speechsdk.ResultReason.RecognizedSpeech and evt.result.text:
            finals.append(evt.result.text)
            asyncio.run_coroutine_threadsafe(msg_queue.put({"type": "partial", "text": evt.result.text}), loop)

    def on_stopped(evt):
        asyncio.run_coroutine_threadsafe(msg_queue.put({"type": "__done__"}), loop)

    recognizer.recognizing.connect(on_recognizing)
    recognizer.recognized.connect(on_recognized)
    recognizer.session_stopped.connect(on_stopped)
    recognizer.canceled.connect(on_stopped)
    recognizer.start_continuous_recognition_async()

    async def receive_audio():
        try:
            while True:
                msg = await websocket.receive()
                if msg["type"] == "websocket.disconnect":
                    break
                raw = msg.get("bytes")
                text = msg.get("text")
                if raw:
                    push_stream.write(raw)
                elif text == "__END__":
                    break
        except (WebSocketDisconnect, Exception):
            pass
        finally:
            push_stream.close()

    audio_task = asyncio.create_task(receive_audio())

    while True:
        item = await msg_queue.get()
        if item["type"] == "__done__":
            break
        try:
            await websocket.send_json(item)
        except Exception:
            break

    await audio_task
    recognizer.stop_continuous_recognition_async()

    full_text = " ".join(finals).strip()
    try:
        await websocket.send_json({"type": "final", "text": full_text})
    except Exception:
        pass


class AdvisorTurnRequest(BaseModel):
    customer_id: str | None = None
    message: str


@app.post("/advisor-turn")
async def advisor_turn(body: AdvisorTurnRequest):
    customer_id = body.customer_id or default_customer_id()
    if not body.message.strip():
        return JSONResponse({"error": "Empty message"}, status_code=400)
    result = run_advisor_turn(customer_id, body.message.strip())
    return result


class ConsentRequest(BaseModel):
    customer_id: str | None = None
    fip_list: list[str] = []


@app.post("/aa/consent")
async def aa_consent(body: ConsentRequest):
    return create_consent(body.customer_id or default_customer_id(), body.fip_list)


@app.get("/aa/fetch/{customer_id}")
async def aa_fetch(customer_id: str):
    return fetch_fi_data(customer_id)


@app.get("/customers/default")
async def customers_default():
    return {"customer_id": default_customer_id()}


@app.get("/customers/{customer_id}/twin")
async def customer_twin(customer_id: str):
    twin = build_twin_state(customer_id)
    return {
        "customer": twin["customer"],
        "net_worth": twin["net_worth"],
        "cash": twin["cash"],
        "investable_holdings_value": twin["investable_holdings_value"],
        "protection_cover": twin["protection_cover"],
        "accounts": twin["accounts"],
        "holdings": twin["holdings"],
        "goals": twin["goals"],
    }


@app.get("/customers/{customer_id}/goals")
async def customer_goals(customer_id: str):
    return {"goals": get_goals(customer_id)}


@app.get("/customers/{customer_id}/scenario")
async def customer_scenario(customer_id: str, goal_name: str | None = None,
                             extra_monthly_contribution: float = 0, one_time_delta: float = 0):
    return run_scenario(customer_id, goal_name, extra_monthly_contribution, one_time_delta)


@app.get("/customers/{customer_id}/recommendations")
async def customer_recommendations(customer_id: str):
    result = run_suitability(customer_id)
    persist_recommendations(customer_id, result["value"]["recommendations"])
    return result


@app.get("/audit-logs")
async def audit_logs(limit: int = 50):
    return {"logs": recent_audit_logs(limit)}


# ── Tavus AI Avatar endpoints ────────────────────────────────────────────

class TavusConversationRequest(BaseModel):
    customer_id: str | None = None


@app.post("/tavus/conversations")
async def tavus_create_conversation(body: TavusConversationRequest):
    if not tavus_client:
        return JSONResponse({"error": "Tavus not configured"}, status_code=502)
    customer_id = body.customer_id or default_customer_id()
    webhook_url = f"{TAVUS_WEBHOOK_BASE_URL}/tavus-webhook"
    try:
        result = await tavus_client.create_conversation(webhook_url=webhook_url, customer_id=customer_id)
    except TavusError as e:
        return JSONResponse({"error": "Tavus conversation failed", "detail": str(e)}, status_code=e.status or 502)
    conversation_id = result.get("conversation_id", "")
    conversation_url = result.get("conversation_url", "")
    turn_store.register_conversation(conversation_id, customer_id)
    return {"conversation_id": conversation_id, "conversation_url": conversation_url, "status": result.get("status", "created")}


class TavusWebhookPayload(BaseModel):
    conversation_id: str = ""
    message: str = ""
    transcript: str | None = None
    query: str | None = None
    turn_id: str | None = None


@app.post("/tavus-webhook")
async def tavus_webhook(payload: TavusWebhookPayload):
    conv_id = payload.conversation_id
    user_message = (payload.message or payload.transcript or payload.query or "").strip()
    if not conv_id or not user_message:
        return {"response": "I didn't catch that - could you say it again?"}
    customer_id = turn_store.get_customer_id(conv_id) or default_customer_id()
    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, run_advisor_turn, customer_id, user_message)
    except Exception:
        return {"response": "Sorry, I hit a hiccup processing that. Could you rephrase?"}
    turn_store.append_turn(conv_id, result)
    return {"response": result.get("reply", "")}


@app.get("/tavus/response/{conversation_id}")
async def tavus_get_responses(conversation_id: str, since_turn_id: str | None = None):
    turns = turn_store.get_turns(conversation_id, since_turn_id=since_turn_id)
    return {"turns": turns, "has_more": False}


@app.post("/tavus/conversations/{conversation_id}/end")
async def tavus_end_conversation(conversation_id: str):
    if tavus_client:
        try:
            await tavus_client.end_conversation(conversation_id)
        except TavusError:
            pass
    turn_store.remove_conversation(conversation_id)
    return {"status": "ended"}


@app.get("/tavus/conversations/{conversation_id}")
async def tavus_get_conversation(conversation_id: str):
    status = turn_store.get_conversation_status(conversation_id)
    if status is None:
        return JSONResponse({"error": "Conversation not found"}, status_code=404)
    return status