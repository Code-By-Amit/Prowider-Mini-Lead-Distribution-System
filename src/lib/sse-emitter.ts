type SendFn = (data: string) => void;

const clients = new Set<SendFn>();

export function addSSEClient(sendFn: SendFn): () => void {
  clients.add(sendFn);
  return () => {
    clients.delete(sendFn);
  };
}

export function broadcast(data: object): void {
  const payload = JSON.stringify(data);
  for (const sendFn of clients) {
    try {
      sendFn(payload);
    } catch {
      clients.delete(sendFn);
    }
  }
}
