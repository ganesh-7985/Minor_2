"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, ChevronRight } from "lucide-react";

const BACKEND = "http://localhost:8000";

export default function LiveMonitoringPage() {
  const [streaming, setStreaming] = useState(false);
  const [streamUrl, setStreamUrl] = useState("");
  const [detectionLogs, setDetectionLogs] = useState<string[]>([]);
  const [summaryUrl, setSummaryUrl] = useState("");

  /* ───── START ───── */
  const startLiveStream = async () => {
    try {
      await fetch(`${BACKEND}/process-live`);          // start the camera thread
      setStreamUrl(`${BACKEND}/stream-live`);          // MJPEG endpoint
      setStreaming(true);
      setDetectionLogs([]);
      setSummaryUrl("");
    } catch (err) {
      console.error(err);
      alert("Could not start live monitoring.");
    }
  };

  /* ───── STOP ───── */
  const stopLiveStream = async () => {
    try {
      const res   = await fetch(`${BACKEND}/stop-live`);
      const json  = await res.json();                  // {logs, summary_video}
      setDetectionLogs(json.logs ?? []);
      setStreaming(false);
      setStreamUrl("");

      if (json.summary_video) {
        const vidRes = await fetch(
          `${BACKEND}/download-video?video_path=${encodeURIComponent(
            json.summary_video
          )}`
        );
        if (vidRes.ok) {
          setSummaryUrl(URL.createObjectURL(await vidRes.blob()));
        }
      }
    } catch (err) {
      console.error(err);
      alert("Error stopping live monitoring.");
    }
  };

  const downloadSummary = () => {
    if (!summaryUrl) return;
    const a = document.createElement("a");
    a.href = summaryUrl;
    a.download = "live_summary.mp4";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  /* ───── UI ───── */
  return (
    <main className="min-h-screen flex flex-col bg-background">
      <header className="py-8 text-center">
        <h1 className="text-4xl font-bold">Live Monitoring</h1>
      </header>

      <section className="flex flex-col items-center">
        {/* live preview */}
        <div className="mb-4">
          {streamUrl ? (
            <img src={streamUrl} alt="Live stream" className="border rounded" />
          ) : (
            <div className="border rounded p-8 text-center bg-muted">
              Live feed will appear here
            </div>
          )}
        </div>

        {/* buttons */}
        <div className="flex gap-4">
          {!streaming ? (
            <Button onClick={startLiveStream} className="bg-green-600">
              Start Live Monitoring
            </Button>
          ) : (
            <Button onClick={stopLiveStream} className="bg-red-600">
              Stop Live Monitoring
            </Button>
          )}
        </div>

        {/* download + logs */}
        {summaryUrl && (
          <div className="mt-8">
            <Button onClick={downloadSummary} className="bg-blue-600">
              <Download className="h-4 w-4 mr-2" />
              Download Summary Clip
            </Button>
          </div>
        )}

        {detectionLogs.length > 0 && (
          <div className="mt-8 w-full max-w-xl">
            <h2 className="text-xl font-semibold mb-2 text-center">
              Detection Logs
            </h2>
            <div className="max-h-64 overflow-y-auto space-y-2 border rounded p-4 bg-secondary">
              {detectionLogs.map((log, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 bg-card p-2 rounded text-sm"
                >
                  <ChevronRight className="h-4 w-4 text-blue-400" />
                  <span>{log}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}