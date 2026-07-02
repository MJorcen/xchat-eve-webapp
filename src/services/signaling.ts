// eve 通话信令 · EMQX/MQTT 通道(主通道;云信为过渡双写,useCall 按 eventId 去重)。
// 对齐 xchat 主 App 模式:客户端匿名连 EMQX,订阅 user/{userId}/notify(QoS1),
// payload = RtmEventEnvelope JSON(与云信同一信封,复用 im.ts parseEveEnvelope)。
// broker dev = EMQX@192.168.10.10(ws 8083);可用 VITE_MQTT_URL 覆盖。
import mqtt from "mqtt";
import { useUserStore } from "@/stores";
import { parseEveEnvelope, type EveSignal } from "./im";

const MQTT_URL = (import.meta.env.VITE_MQTT_URL as string) || "ws://192.168.10.10:8083/mqtt";

let client: mqtt.MqttClient | null = null;
let subscribedTopic: string | null = null;

/**
 * 启动 MQTT 信令订阅(幂等;掉线自动重连由 mqtt.js 内置)。
 * clientId 带随机尾缀:与主 App 的 cli-{userId} 区分,避免同 clientId 互踢。
 */
export function startMqttSignals(cb: (sig: EveSignal) => void): () => void {
  const store = useUserStore();
  const userId = store.user.id;
  if (!userId) return () => {};
  const topic = `user/${userId}/notify`;

  if (!client) {
    client = mqtt.connect(MQTT_URL, {
      clientId: `eve-web-${userId}-${Math.random().toString(16).slice(2, 8)}`,
      clean: true,
      keepalive: 60,
      reconnectPeriod: 3000,
      connectTimeout: 8000
    });
    client.on("connect", () => {
      // eslint-disable-next-line no-console
      console.log(`%c[MQTT] connected ${MQTT_URL}`, "color:#31c859;font-weight:bold");
      // 重连后重新订阅(clean session 下订阅不保留)
      if (subscribedTopic) client?.subscribe(subscribedTopic, { qos: 1 });
    });
    client.on("error", (e) => {
      // eslint-disable-next-line no-console
      console.warn("[MQTT] error", e?.message);
    });
  }

  subscribedTopic = topic;
  client.subscribe(topic, { qos: 1 }, (err) => {
    // eslint-disable-next-line no-console
    if (err) console.warn("[MQTT] subscribe failed", topic, err.message);
    else console.log(`%c[MQTT] subscribed ${topic}`, "color:#31c859;font-weight:bold");
  });

  const handler = (t: string, payload: Uint8Array) => {
    if (t !== topic) return;
    const sig = parseEveEnvelope(new TextDecoder().decode(payload));
    if (sig && sig.messageType) {
      // eslint-disable-next-line no-console
      console.log(`%c[MQTT] signal ${sig.messageType} eventId=${sig.eventId}`, "color:#31c859");
      cb(sig);
    }
  };
  client.on("message", handler);

  return () => {
    client?.off("message", handler);
    if (subscribedTopic) client?.unsubscribe(subscribedTopic);
    subscribedTopic = null;
  };
}
