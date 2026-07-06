"use client";

import React, { useState, useRef } from "react";
import axios from "axios";
import {
  Upload,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  Paperclip,
  CloudUpload,
  FolderPlus,
  AlertTriangle,
} from "lucide-react";

export interface UploadedDoc {
  name: string;
  url: string;
  size?: number;
  uploadedAt: string;
  warning?: string | null;
}

interface DocumentUploaderProps {
  label?: string;
  bucket?: string;
  onUploadComplete?: (doc: UploadedDoc) => void;
  onRemove?: (url: string) => void;
  initialDocs?: UploadedDoc[];
  accept?: string;
  maxSizeMB?: number;
}

export function DocumentUploader({
  label = "Upload KYC or Collateral Document to Supabase Bucket",
  bucket = "pawnify-docs",
  onUploadComplete,
  onRemove,
  initialDocs = [],
  accept = ".pdf,.png,.jpg,.jpeg,.doc,.docx",
  maxSizeMB = 10,
}: DocumentUploaderProps) {
  const [docs, setDocs] = useState<UploadedDoc[]>(initialDocs);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    setWarning(null);

    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`File '${file.name}' exceeds maximum allowed size of ${maxSizeMB}MB.`);
      } else {
        validFiles.push(file);
      }
    }

    if (validFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...validFiles]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const uploadFiles = async () => {
    if (selectedFiles.length === 0) return;
    setUploading(true);
    setError(null);
    setWarning(null);
    setProgress(0);

    try {
      const uploadedResults: UploadedDoc[] = [];
      let lastWarning: string | null = null;

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("bucket", bucket);

        // Perform Axios API call with upload progress monitoring
        const res = await axios.post("/api/storage/upload", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setProgress(percentCompleted);
            }
          },
        });

        const data = res.data;
        if (data.warning) {
          lastWarning = data.warning;
        }

        const newDoc: UploadedDoc = {
          name: file.name,
          url: data.url || URL.createObjectURL(file),
          size: file.size,
          uploadedAt: new Date().toLocaleDateString("en-IN"),
          warning: data.warning || null,
        };

        uploadedResults.push(newDoc);
        if (onUploadComplete) {
          onUploadComplete(newDoc);
        }
      }

      setDocs((prev) => [...prev, ...uploadedResults]);
      setSelectedFiles([]);
      if (lastWarning) {
        setWarning(lastWarning);
      }
    } catch (err: unknown) {
      let message = "Error uploading file to Supabase storage";
      if (axios.isAxiosError(err)) {
        message = err.response?.data?.error || err.message;
      } else if (err instanceof Error) {
        message = err.message;
      }
      setError(message);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const removeDoc = (url: string) => {
    setDocs((prev) => prev.filter((d) => d.url !== url));
    if (onRemove) onRemove(url);
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  return (
    <div className="space-y-4 w-full font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
          <Paperclip className="w-3.5 h-3.5 text-emerald-400" />
          {label}
        </label>
        <span className="text-[10px] text-zinc-500 font-mono uppercase px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 self-start sm:self-auto">
          Supabase Bucket: <strong className="text-emerald-400">{bucket}</strong>
        </span>
      </div>

      {/* Drag and drop selection area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          handleFileSelect(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2.5 ${
          dragActive
            ? "border-emerald-500 bg-emerald-500/10 scale-[0.99]"
            : "border-zinc-700/60 hover:border-emerald-500/50 bg-zinc-900/40 hover:bg-zinc-900/80"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={accept}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />
        <div className="w-11 h-11 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shadow-inner">
          <FolderPlus className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xs font-semibold text-zinc-200">
            Click to browse or drag & drop documents here
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5">
            Supports PDF, PNG, JPG, DOCX (Max {maxSizeMB}MB per file)
          </div>
        </div>
      </div>

      {/* Selected files pending upload */}
      {selectedFiles.length > 0 && (
        <div className="p-4 rounded-xl bg-zinc-900/90 border border-emerald-500/30 space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
              <CloudUpload className="w-4 h-4 text-emerald-400" />
              Ready to Upload ({selectedFiles.length} file{selectedFiles.length > 1 ? "s" : ""})
            </span>
            <button
              type="button"
              onClick={() => setSelectedFiles([])}
              className="text-[11px] text-zinc-500 hover:text-red-400 transition-colors"
            >
              Clear All
            </button>
          </div>

          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {selectedFiles.map((f, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs p-2 rounded-lg bg-zinc-950/60 border border-zinc-800 text-zinc-300"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate font-medium">{f.name}</span>
                  <span className="text-[10px] text-zinc-500 shrink-0">
                    ({(f.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeSelectedFile(idx)}
                  className="text-zinc-500 hover:text-red-400 p-1"
                  title="Remove from queue"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          {uploading && (
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-zinc-400 font-mono">
                <span>Uploading via Axios Proxy...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="button"
              disabled={uploading}
              onClick={uploadFiles}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-zinc-950 font-bold text-xs shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading to {bucket}...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload to Supabase Bucket
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Error and Warning Banners */}
      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2.5 animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold">Upload Failed</div>
            <div>{error}</div>
          </div>
        </div>
      )}

      {warning && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5 animate-fadeIn">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          <div className="space-y-1">
            <div className="font-bold">Supabase Configuration Notice</div>
            <div>{warning}</div>
          </div>
        </div>
      )}

      {/* Uploaded Documents List */}
      {docs.length > 0 && (
        <div className="space-y-2 mt-4">
          <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
            <span>Uploaded Documents ({docs.length})</span>
            <span className="text-[10px] text-emerald-400 font-normal">Active in Storage</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {docs.map((doc, idx) => {
              const isImg = doc.name.match(/\.(png|jpe?g|gif|webp)$/i);
              return (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800/80 flex items-center justify-between gap-3 group hover:border-emerald-500/30 transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                      {isImg ? <ImageIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-zinc-200 truncate" title={doc.name}>
                        {doc.name}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono flex items-center gap-1">
                        <span>{doc.uploadedAt}</span>
                        <span>·</span>
                        <span className={doc.warning ? "text-amber-400" : "text-emerald-400"}>
                          {doc.warning ? "Local Fallback" : "Supabase Cloud"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); copyToClipboard(doc.url); }}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-400 hover:bg-white/5 transition-all"
                      title="Copy Storage URL"
                    >
                      {copiedUrl === doc.url ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-400 hover:bg-white/5 transition-all"
                      title="Open Document"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeDoc(doc.url); }}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-white/5 transition-all"
                      title="Remove Document"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
