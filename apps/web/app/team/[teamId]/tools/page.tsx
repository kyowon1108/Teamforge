"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  Send,
  Trash2,
  ChevronDown,
  ChevronUp,
  Link2,
  Wrench,
  Star,
  Bell,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type IntegrationStatus = "connected" | "disconnected" | "error";

type Integration = {
  id: string;
  tool: string;
  status: IntegrationStatus;
  meta: Record<string, unknown> | null;
  connectedAt: string | null;
  lastUsedAt: string | null;
};

type ToolDef = {
  key: string;
  name: string;
  description: string;
  category: "essential" | "notify" | "dev";
  connectType: "webhook" | "oauth" | "apitoken";
  webhookPrefix?: string;
  guideSteps?: string[];
  oauthUrl?: string;
  placeholder?: string;
  docsUrl: string;
};

// ─────────────────────────────────────────────
// Tool definitions
// ─────────────────────────────────────────────

const TOOLS: ToolDef[] = [
  {
    key: "github",
    name: "GitHub",
    description: "PR, 이슈, 커밋 이벤트를 TeamForge에 연동합니다.",
    category: "essential",
    connectType: "webhook",
    placeholder: "https://github.com/webhooks/...",
    guideSteps: [
      "GitHub 레포지토리 → Settings → Webhooks",
      '"Add webhook" 클릭',
      "Payload URL: 아래 TeamForge 수신 URL 입력",
      "Content type: application/json 선택",
      "이벤트: Pull requests, Issues, Push 선택 후 저장",
    ],
    docsUrl: "https://docs.github.com/en/webhooks/about-webhooks",
  },
  {
    key: "slack",
    name: "Slack",
    description: "킥오프 완료, 서명 요청 등 알림을 Slack 채널로 전송합니다.",
    category: "essential",
    connectType: "webhook",
    webhookPrefix: "https://hooks.slack.com/",
    placeholder: "https://hooks.slack.com/services/T.../B.../...",
    guideSteps: [
      "app.slack.com/apps → 앱 생성 (또는 기존 앱 선택)",
      "Incoming Webhooks → ON",
      '"Add New Webhook to Workspace" → 채널 선택',
      "Webhook URL 복사 후 아래에 붙여넣기",
    ],
    docsUrl: "https://api.slack.com/messaging/webhooks",
  },
  {
    key: "discord",
    name: "Discord",
    description: "Discord 채널로 팀 알림을 받습니다.",
    category: "notify",
    connectType: "webhook",
    webhookPrefix: "https://discord.com/api/webhooks/",
    placeholder: "https://discord.com/api/webhooks/...",
    guideSteps: [
      "Discord 채널 우클릭 → Edit Channel → Integrations",
      '"New Webhook" → 이름 입력',
      '"Copy Webhook URL" → 아래에 붙여넣기',
    ],
    docsUrl: "https://support.discord.com/hc/en-us/articles/228383668",
  },
  {
    key: "notion",
    name: "Notion",
    description: "킥오프 요약, 회의록을 Notion에 자동 저장합니다.",
    category: "essential",
    connectType: "webhook",
    placeholder: "https://api.notion.com/v1/...",
    guideSteps: [
      "Notion Settings → Connections → Develop or manage integrations",
      "새 Internal Integration 생성 → API 토큰 복사",
      "저장할 페이지에서 ··· → Add connections → 연동 허용",
      "아래에 API 토큰 입력",
    ],
    docsUrl: "https://www.notion.so/integrations",
  },
  {
    key: "linear",
    name: "Linear",
    description: "Linear 이슈와 TeamForge를 연결합니다.",
    category: "dev",
    connectType: "webhook",
    placeholder: "https://linear.app/...",
    guideSteps: [
      "Linear → Settings → API → Webhooks",
      '"New Webhook" → Payload URL 입력',
      "이벤트: Issue 선택 후 저장",
    ],
    docsUrl: "https://linear.app/integrations",
  },
  {
    key: "jira",
    name: "Jira",
    description: "Jira 이슈 업데이트를 TeamForge에 연동합니다.",
    category: "dev",
    connectType: "apitoken",
    placeholder: "https://your-domain.atlassian.net/rest/api/...",
    guideSteps: [
      "Jira → Project Settings → Webhooks",
      '"Create a WebHook" → URL 입력',
      "이벤트: Issue created/updated 선택 후 저장",
    ],
    docsUrl: "https://support.atlassian.com/jira-cloud-administration/docs/set-up-a-webhook/",
  },
];

const CATEGORIES: { key: string; label: string; icon: React.ReactNode }[] = [
  { key: "essential", label: "핵심 도구", icon: <Star size={13} /> },
  { key: "notify", label: "알림", icon: <Bell size={13} /> },
  { key: "dev", label: "개발 도구", icon: <Wrench size={13} /> },
];

// ─────────────────────────────────────────────
// IntegrationCard
// ─────────────────────────────────────────────

function StatusBadge({ status }: { status: IntegrationStatus }) {
  if (status === "connected") {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
        style={{ background: "var(--tf-bg-positive)", color: "var(--tf-fg-positive)" }}>
        <CheckCircle2 size={11} /> 연결됨
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
        style={{ background: "var(--tf-bg-negative)", color: "var(--tf-fg-negative)" }}>
        <AlertCircle size={11} /> 오류
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
      style={{ background: "var(--tf-bg-layer-alt)", color: "var(--tf-fg-muted)" }}>
      <XCircle size={11} /> 미연결
    </span>
  );
}

function IntegrationCard({
  toolDef,
  integration,
  isLeader,
  teamId,
  onRefresh,
}: {
  toolDef: ToolDef;
  integration: Integration | undefined;
  isLeader: boolean;
  teamId: string;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const status = integration?.status ?? "disconnected";

  const handleSave = async () => {
    if (!webhookUrl.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await apiClient.post(`/integrations/${teamId}/webhook`, {
        tool: toolDef.key,
        webhookUrl: webhookUrl.trim(),
      });
      setWebhookUrl("");
      setExpanded(false);
      onRefresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "저장에 실패했습니다.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm(`${toolDef.name} 연동을 해제하시겠습니까?`)) return;
    try {
      await apiClient.delete(`/integrations/${teamId}/${toolDef.key}`);
      onRefresh();
    } catch {
      // ignore
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await apiClient.post<{ success: boolean; message: string }>(
        `/integrations/${teamId}/${toolDef.key}/test`,
        {}
      );
      setTestResult(result);
    } catch {
      setTestResult({ success: false, message: "테스트 요청에 실패했습니다." });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div
      className="rounded-2xl border bg-white overflow-hidden"
      style={{ borderColor: status === "connected" ? "var(--tf-stroke-positive)" : "var(--tf-stroke-neutral)" }}
    >
      {/* Card header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
              style={{ background: "var(--tf-bg-brand-solid)" }}
            >
              {toolDef.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="font-semibold text-sm" style={{ color: "var(--tf-fg-default)" }}>
                  {toolDef.name}
                </p>
                <StatusBadge status={status} />
              </div>
              <p className="text-xs" style={{ color: "var(--tf-fg-muted)" }}>
                {toolDef.description}
              </p>
            </div>
          </div>
          <a
            href={toolDef.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0"
            title="문서 보기"
          >
            <ExternalLink size={14} style={{ color: "var(--tf-fg-muted)" }} />
          </a>
        </div>

        {/* Connected info */}
        {status === "connected" && integration?.connectedAt && (
          <p className="mt-2 text-xs" style={{ color: "var(--tf-fg-muted)" }}>
            {new Date(integration.connectedAt).toLocaleDateString("ko-KR")} 연결
            {integration.lastUsedAt &&
              ` · 마지막 사용: ${new Date(integration.lastUsedAt).toLocaleDateString("ko-KR")}`}
          </p>
        )}

        {/* Actions */}
        {isLeader && (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {status === "connected" ? (
              <>
                <button
                  onClick={handleTest}
                  disabled={testing}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors hover:bg-[var(--tf-bg-layer-alt)] disabled:opacity-50"
                  style={{ borderColor: "var(--tf-stroke-neutral)", color: "var(--tf-fg-default)" }}
                >
                  {testing ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                  테스트
                </button>
                <button
                  onClick={handleDisconnect}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors hover:bg-[var(--tf-bg-negative)]"
                  style={{ borderColor: "var(--tf-stroke-neutral)", color: "var(--tf-fg-negative)" }}
                >
                  <Trash2 size={12} />
                  연결 해제
                </button>
              </>
            ) : (
              <button
                onClick={() => { setExpanded((e) => !e); setTimeout(() => inputRef.current?.focus(), 100); }}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors hover:opacity-90"
                style={{ background: "var(--tf-bg-brand-solid)", color: "#fff" }}
              >
                <Link2 size={12} />
                연결하기
                {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            )}
          </div>
        )}

        {/* Test result */}
        {testResult && (
          <div
            className="mt-2 text-xs px-3 py-2 rounded-lg"
            style={{
              background: testResult.success ? "var(--tf-bg-positive)" : "var(--tf-bg-negative)",
              color: testResult.success ? "var(--tf-fg-positive)" : "var(--tf-fg-negative)",
            }}
          >
            {testResult.message}
          </div>
        )}
      </div>

      {/* Inline connect form */}
      {expanded && isLeader && status !== "connected" && (
        <div
          className="px-4 pb-4 pt-0"
          style={{ borderTop: "1px solid var(--tf-stroke-neutral)", paddingTop: "12px", marginTop: "-4px" }}
        >
          {/* Step guide */}
          {toolDef.guideSteps && (
            <ol className="mb-3 space-y-1">
              {toolDef.guideSteps.map((step, i) => (
                <li key={i} className="flex gap-2 text-xs" style={{ color: "var(--tf-fg-muted)" }}>
                  <span
                    className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-white text-[10px] font-bold mt-0.5"
                    style={{ background: "var(--tf-bg-brand-solid)" }}
                  >
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          )}

          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder={toolDef.placeholder ?? "URL 또는 토큰 입력"}
              className="flex-1 text-xs px-3 py-2 rounded-lg border outline-none focus:border-[var(--tf-stroke-brand)]"
              style={{
                borderColor: "var(--tf-stroke-neutral)",
                background: "var(--tf-bg-layer-alt)",
                color: "var(--tf-fg-default)",
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
            <button
              onClick={handleSave}
              disabled={saving || !webhookUrl.trim()}
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: "var(--tf-bg-brand-solid)", color: "#fff" }}
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : "저장"}
            </button>
          </div>
          {error && (
            <p className="mt-1.5 text-xs" style={{ color: "var(--tf-fg-negative)" }}>{error}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

export default function ToolsPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const { data: session, status } = useSession();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLeader, setIsLeader] = useState(false);

  const fetchData = async () => {
    try {
      const [intData, teamsData] = await Promise.all([
        apiClient.get<Integration[]>(`/integrations/${teamId}`),
        apiClient.get<{ teamId: string; role: string }[]>("/teams"),
      ]);
      setIntegrations(intData);
      const myTeam = teamsData.find((t) => t.teamId === teamId);
      setIsLeader(myTeam?.role === "leader");
    } catch {
      setIntegrations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status !== "authenticated") return;
    fetchData();
  }, [status, teamId]);

  if (loading || status === "loading") {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={24} className="animate-spin" style={{ color: "var(--tf-fg-muted)" }} />
      </div>
    );
  }

  const getIntegration = (toolKey: string) =>
    integrations.find((i) => i.tool === toolKey);

  const connectedCount = integrations.filter((i) => i.status === "connected").length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Wrench size={20} style={{ color: "var(--tf-fg-brand)" }} />
          <h1 className="text-xl font-bold" style={{ color: "var(--tf-fg-default)" }}>
            협업 도구 연동
          </h1>
        </div>
        <p className="text-sm" style={{ color: "var(--tf-fg-muted)" }}>
          팀이 사용하는 도구를 연결하면 TeamForge가 자동으로 데이터를 수집합니다.
          {connectedCount > 0 && (
            <span className="ml-2 font-medium" style={{ color: "var(--tf-fg-positive)" }}>
              {connectedCount}개 연결됨
            </span>
          )}
        </p>
        {!isLeader && (
          <div
            className="mt-3 text-xs px-3 py-2 rounded-lg"
            style={{ background: "var(--tf-bg-layer-alt)", color: "var(--tf-fg-muted)" }}
          >
            연동 설정은 팀장만 변경할 수 있습니다. 현재 연결 상태를 확인할 수 있습니다.
          </div>
        )}
      </div>

      {/* Tool categories */}
      <div className="space-y-8">
        {CATEGORIES.map((cat) => {
          const catTools = TOOLS.filter((t) => t.category === cat.key);
          return (
            <div key={cat.key}>
              <h2 className="flex items-center gap-1.5 text-sm font-semibold mb-3" style={{ color: "var(--tf-fg-muted)" }}>
                {cat.icon}
                {cat.label}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {catTools.map((tool) => (
                  <IntegrationCard
                    key={tool.key}
                    toolDef={tool}
                    integration={getIntegration(tool.key)}
                    isLeader={isLeader}
                    teamId={teamId}
                    onRefresh={fetchData}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
