"use client";

import { useState } from "react";
import { FileText, Github, AlertCircle, Check, Loader2, XCircle } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

interface Props {
  answers: Record<string, unknown>;
  updateAnswers: (a: Record<string, unknown>) => void;
  teamId?: string;
}

export default function Section6Portfolio({ answers, updateAnswers, teamId }: Props) {
  const githubUrl = (answers.githubUrl ?? "") as string;
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeUploaded, setResumeUploaded] = useState(!!answers.resumeUploaded);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleResumeUpload = async (file: File) => {
    setUploadError(null);

    if (file.type !== "application/pdf") {
      setUploadError("PDF 파일만 업로드할 수 있어요.");
      toast.error("PDF 파일만 업로드할 수 있어요.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("파일 크기가 5MB를 초과했어요.");
      toast.error("파일 크기가 5MB를 초과했어요.");
      return;
    }
    if (!teamId) {
      setUploadError("팀 정보를 찾을 수 없어요.");
      toast.error("팀 정보를 찾을 수 없어요.");
      return;
    }

    setResumeFile(file);
    setResumeUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("teamId", teamId);

      await apiClient.upload("/survey/upload/resume", formData);
      setResumeUploaded(true);
      updateAnswers({ resumeUploaded: true, resumeFileName: file.name });
      toast.success("이력서가 업로드되었어요.");
    } catch (err: unknown) {
      const e = err as { message?: string };
      const msg = e?.message ?? "업로드에 실패했어요. 다시 시도해주세요.";
      setUploadError(msg);
      toast.error(msg);
    } finally {
      setResumeUploading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-[18px] font-semibold text-[var(--tf-fg-default)] mb-1">
          포트폴리오
        </h2>
        <p className="text-[13px] text-[var(--tf-fg-muted)]">
          선택 항목이에요. 입력하면 더 정확한 분석을 받을 수 있어요.
        </p>
      </div>

      {/* Q14: Resume upload */}
      <div className="space-y-3">
        <p className="text-[14px] font-medium text-[var(--tf-fg-default)]">
          Q14. 이력서 PDF 업로드 <span className="text-[12px] text-[var(--tf-fg-subtle)]">(선택)</span>
        </p>
        <div
          className={`border-2 border-dashed rounded-r2 p-6 text-center space-y-2 transition-colors ${
            resumeUploaded
              ? "border-[var(--tf-stroke-brand)] bg-[var(--tf-bg-info)]"
              : "border-[var(--tf-stroke-neutral)]"
          }`}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files[0];
            if (f) handleResumeUpload(f);
          }}
        >
          {resumeUploading ? (
            <Loader2 className="w-8 h-8 text-[var(--tf-fg-brand)] animate-spin mx-auto" />
          ) : resumeUploaded ? (
            <Check className="w-8 h-8 text-[var(--tf-fg-positive)] mx-auto" />
          ) : (
            <FileText className="w-8 h-8 text-[var(--tf-fg-subtle)] mx-auto" />
          )}
          <p className="text-[13px] text-[var(--tf-fg-muted)]">
            {resumeUploaded
              ? `${resumeFile?.name ?? answers.resumeFileName ?? "이력서"} 업로드 완료`
              : "PDF 파일을 드래그하거나 클릭해 업로드"}
          </p>
          <p className="text-[11px] text-[var(--tf-fg-subtle)]">최대 5MB</p>
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            id="resume-upload"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleResumeUpload(f);
            }}
          />
          {!resumeUploaded && (
            <label
              htmlFor="resume-upload"
              className="inline-flex items-center h-9 px-4 rounded-r2 border border-[var(--tf-stroke-neutral)] text-[13px] text-[var(--tf-fg-muted)] cursor-pointer hover:bg-[var(--tf-bg-layer-alt)] transition-colors"
            >
              파일 선택
            </label>
          )}
        </div>
        {uploadError && (
          <div className="flex items-start gap-2 p-3 rounded-r2 bg-[var(--tf-bg-warning)]">
            <XCircle className="w-4 h-4 text-[var(--tf-fg-warning)] shrink-0 mt-0.5" />
            <p className="text-[12px] text-[var(--tf-fg-warning)]">{uploadError}</p>
          </div>
        )}
        <div className="flex items-start gap-2 p-3 rounded-r2 bg-[var(--tf-bg-layer-alt)]">
          <AlertCircle className="w-4 h-4 text-[var(--tf-fg-subtle)] shrink-0 mt-0.5" />
          <p className="text-[11px] text-[var(--tf-fg-subtle)]">
            이력서는 AI 분석 후 30일 뒤 자동 삭제됩니다. 분석 결과(기술 스택, 역할)만 보관됩니다.
          </p>
        </div>
      </div>

      {/* Q15: GitHub URL */}
      <div className="space-y-3">
        <p className="text-[14px] font-medium text-[var(--tf-fg-default)]">
          Q15. GitHub URL <span className="text-[12px] text-[var(--tf-fg-subtle)]">(선택)</span>
        </p>
        <div className="flex items-center gap-2">
          <Github className="w-5 h-5 text-[var(--tf-fg-muted)] shrink-0" />
          <input
            type="url"
            value={githubUrl}
            onChange={(e) => updateAnswers({ githubUrl: e.target.value })}
            placeholder="https://github.com/username"
            className="w-full h-11 px-3 rounded-r2 border border-[var(--tf-stroke-neutral)] bg-[var(--tf-bg-layer-default)] text-[14px] text-[var(--tf-fg-default)] placeholder:text-[var(--tf-fg-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--tf-stroke-focus)] transition-shadow"
          />
        </div>
        <p className="text-[11px] text-[var(--tf-fg-subtle)]">
          GitHub 공개 정보(언어 통계, 커밋 빈도)를 수집합니다.
        </p>
      </div>
    </div>
  );
}
