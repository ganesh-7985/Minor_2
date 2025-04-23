"use client";

import { useState, useRef } from "react";
import {
  Upload,
  Download,
  Zap,
  ChevronRight,
  Play,
} from "lucide-react";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

const BACKEND = "http://localhost:8000";

export default function Home() {
  /* ── state ── */
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [processingStage, setProcessingStage] = useState(0);
  const [processSteps, setProcessSteps] = useState<string[]>([]);
  const [detectionLogs, setDetectionLogs] = useState<string[]>([]);
  const [videoURL, setVideoURL] = useState("");
  const [activeTab, setActiveTab] = useState("upload");
  const [videoReady, setVideoReady] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── helpers ── */
  const resetState = () => {
    setProcessSteps([]);
    setDetectionLogs([]);
    setVideoURL("");
    setVideoReady(false);
    setProcessingStage(0);
    setActiveTab("upload");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && f.type.startsWith("video/")) {
      resetState();
      setVideoFile(f);
    }
  };

  const handleUpload = async () => {
    if (!videoFile) return;
    setLoading(true);
    resetState();

    const stages = [
      "Initializing CCTV footage processing...",
      "Analyzing footage for motion...",
      "Detecting objects of interest...",
      "Optimizing video segments...",
      "Generating optimized output...",
    ];

    const form = new FormData();
    form.append("file", videoFile);

    try {
      /* tiny fake progress */
      for (let i = 0; i < stages.length; i++) {
        setProcessSteps((p) => [...p, stages[i]]);
        await new Promise((r) => setTimeout(r, 1200));
        setProcessingStage(i + 1);
      }

      const res  = await fetch(`${BACKEND}/process-video`, { method: "POST", body: form });
      const json = await res.json();
      setDetectionLogs(json.logs);

      /* download resulting clip so user can preview */
      const vidRes = await fetch(
        `${BACKEND}/download-video?video_path=${encodeURIComponent(
          json.summary_video
        )}`
      );
      if (vidRes.ok) {
        setVideoURL(URL.createObjectURL(await vidRes.blob()));
        setVideoReady(true);
        setActiveTab("results");
        alert("Video processing complete! Check the Results tab.");
      }
    } catch (err) {
      console.error(err);
      setProcessSteps((p) => [...p, "Error processing video."]);
    }
    setLoading(false);
  };

  const handleLiveProcessing = async () => {
    setLoading(true);
    resetState();
    try {
      await fetch(`${BACKEND}/process-live`);
      alert(
        "Live monitoring started.\nOpen the Live Monitoring page to view the stream."
      );
    } catch (err) {
      console.error(err);
      setProcessSteps((p) => [...p, "Error starting live monitoring."]);
    }
    setLoading(false);
  };

  const downloadVideo = () => {
    if (!videoURL) return;
    const a = document.createElement("a");
    a.href = videoURL;
    a.download = "cctv_optimized_video.mp4";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  /* ── JSX ── */
  return (
    <main className="min-h-screen flex flex-col bg-background">
      <Header />

      <section className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {/* heading */}
            <div className="text-center mb-12">
              <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400 mb-4">
                CCTV Footage Optimizer
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Enhance your surveillance footage with AI‑driven detection.
              </p>
            </div>

            {/* card */}
            <Card className="border border-blue-900/30 bg-card shadow-lg">
              <CardHeader>
                <CardTitle>Video Processing</CardTitle>
                <CardDescription>
                  Upload a video or trigger live monitoring.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid grid-cols-2 bg-muted mb-6">
                    <TabsTrigger value="upload">Upload Video</TabsTrigger>
                    <TabsTrigger
                      value="results"
                      disabled={!videoReady && detectionLogs.length === 0}
                    >
                      Results
                    </TabsTrigger>
                  </TabsList>

                  {/* UPLOAD TAB */}
                  <TabsContent value="upload" className="space-y-6">
                    {/* drag & drop area */}
                    <div
                      className={`rounded-xl border-2 border-dashed p-8 text-center transition-all ${
                        videoFile ? "bg-blue-500/5" : ""
                      }`}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const f = e.dataTransfer.files[0];
                        if (f && f.type.startsWith("video/")) {
                          resetState();
                          setVideoFile(f);
                        }
                      }}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                      <div className="flex flex-col items-center gap-4">
                        <div className="rounded-full bg-blue-500/20 p-4">
                          <Upload className="h-8 w-8 text-blue-400" />
                        </div>
                        {videoFile ? (
                          <>
                            <p className="font-medium">{videoFile.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="font-medium">
                              Drag & drop a CCTV video here
                            </p>
                            <p className="text-sm text-muted-foreground">
                              or click to browse
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    {/* buttons */}
                    <div className="flex justify-center gap-4">
                      <Button
                        size="lg"
                        onClick={handleUpload}
                        disabled={!videoFile || loading}
                        className="bg-blue-600"
                      >
                        {loading ? (
                          <span className="flex items-center gap-2">
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                            Processing...
                          </span>
                        ) : (
                          <>
                            <Zap className="h-4 w-4 mr-2" />
                            Optimize Video
                          </>
                        )}
                      </Button>

                      <Button
                        variant="outline"
                        size="lg"
                        onClick={handleLiveProcessing}
                        disabled={loading}
                        className="border-blue-400 text-blue-400"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Start Live Monitoring
                      </Button>
                    </div>

                    {/* fake progress list */}
                    {loading && (
                      <div className="mt-8 p-4 rounded border bg-secondary/50 space-y-2 max-h-40 overflow-y-auto">
                        {processSteps.map((step, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 text-sm bg-secondary p-2 rounded"
                          >
                            <ChevronRight className="h-4 w-4 text-blue-400" />
                            {step}
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* RESULTS TAB */}
                  <TabsContent value="results">
                    {videoReady ? (
                      <div className="space-y-6">
                        <div className="text-center">
                          <p className="text-lg mb-2">
                            Optimized video is ready!
                          </p>
                          <Button
                            onClick={downloadVideo}
                            className="bg-blue-600"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download Video
                          </Button>
                        </div>

                        <div>
                          <h3 className="text-xl font-semibold mb-3">
                            Detection Logs
                          </h3>
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {detectionLogs.length > 0 ? (
                              detectionLogs.map((log, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-2 text-sm bg-card p-2 rounded"
                                >
                                  <ChevronRight className="h-4 w-4 text-blue-400" />
                                  {log}
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                No logs available.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-center">
                        Process a video first to see results.
                      </p>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}