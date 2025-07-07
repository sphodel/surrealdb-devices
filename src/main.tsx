import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { SurrealProvider } from "./api/SurrealProvider.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

const root = ReactDOM.createRoot(document.getElementById("root")!);

root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <SurrealProvider
        endpoint="wss://xplayer-db.piupiupiu.cc/rpc"
        autoConnect
        params={{
          namespace: "xplayer",
          database: "xplayer"
        }}
      >
        <App />
      </SurrealProvider>
    </QueryClientProvider>
  </React.StrictMode>
);