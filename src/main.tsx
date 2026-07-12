import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getCurrentWindow } from "@tauri-apps/api/window";
import App from "./App";
import Widget from "./components/Widget";
import "./index.css";

// The same bundle drives both windows; the window label decides the view.
const isWidget = getCurrentWindow().label === "widget";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      {isWidget ? <Widget /> : <App />}
    </QueryClientProvider>
  </React.StrictMode>
);
