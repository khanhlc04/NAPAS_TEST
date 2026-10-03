"use client";

import { useState, useTransition } from "react";
import { formatDateTime } from "@/lib/format";
import { revalidateLogsAction } from "@/app/actions";

export interface ExtractionItem {
  id: string;
  issue_key: string;
  attempt: number;
  input_hash: string;
  model: string;
  output: unknown;
  confidence: number | null;
  outcome: "filled" | "asked" | "not_request" | "failed";
  missing_fields: string[];
  latency_ms: number | null;
  error: string | null;
  created_at: string;
}

export interface KpiStats {
  total: number;
  filled: number;
  asked: number;
  notRequest: number;
  failed: number;
  avgLatencyMs: number;
  fillRate: number;
}

interface Props {
  initialLogs: ExtractionItem[];
  jiraBaseUrl: string;
  kpi: KpiStats;
}

const OUTCOME_LABEL: Record<ExtractionItem["outcome"], string> = {
  filled: "Đã điền tự động",
  asked: "Yêu cầu bổ sung",
  not_request: "Không phải yêu cầu",
  failed: "Lỗi xử lý",
};

export function AiLogViewer({ initialLogs, jiraBaseUrl, kpi }: Props) {
  const [search, setSearch] = useState("");
  const [selectedOutcome, setSelectedOutcome] = useState<string>("all");
  const [selectedLog, setSelectedLog] = useState<ExtractionItem | null>(null);
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  // Lọc nhật ký theo từ khóa tìm kiếm và trạng thái
  const filteredLogs = initialLogs.filter((log) => {
    const matchesSearch =
      search.trim() === "" ||
      log.issue_key.toLowerCase().includes(search.toLowerCase().trim()) ||
      log.model.toLowerCase().includes(search.toLowerCase().trim()) ||
      (log.error && log.error.toLowerCase().includes(search.toLowerCase().trim()));

    const matchesOutcome = selectedOutcome === "all" || log.outcome === selectedOutcome;

    return matchesSearch && matchesOutcome;
  });

  const handleRefresh = () => {
    startTransition(async () => {
      await revalidateLogsAction();
    });
  };

  const handleCopyJson = (content: unknown) => {
    navigator.clipboard.writeText(JSON.stringify(content, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="app-title-group">
          <div className="brand-badge">
            <span className="pulse-dot"></span>
            NAPAS IT Access Automation
          </div>
          <h1 className="app-heading">Nhật ký AI Xử lý Email (Supabase)</h1>
          <p className="app-subheading">
            Theo dõi chi tiết các lượt AI đọc email xin cấp quyền, phân tích nghiệp vụ, tính toán độ tin cậy và tự động hóa cập nhật vào Jira Service Management.
          </p>
        </div>

        <div className="header-actions">
          <button
            onClick={handleRefresh}
            disabled={isPending}
            className="btn btn-secondary btn-sm"
            title="Làm mới dữ liệu từ Supabase"
          >
            {isPending ? "Đang tải..." : "🔄 Làm mới"}
          </button>
        </div>
      </header>

      {/* KPI Stats Cards */}
      <section className="metrics-grid">
        <div className="glass-panel metric-card accent-blue">
          <span className="metric-title">Tổng lượt xử lý</span>
          <div className="metric-value-row">
            <span className="metric-value">{kpi.total}</span>
            <span className="metric-sub">lần gọi AI</span>
          </div>
        </div>

        <div className="glass-panel metric-card accent-green">
          <span className="metric-title">Tỷ lệ tự động điền</span>
          <div className="metric-value-row">
            <span className="metric-value">{kpi.fillRate}%</span>
            <span className="metric-sub">({kpi.filled} yêu cầu)</span>
          </div>
        </div>

        <div className="glass-panel metric-card accent-amber">
          <span className="metric-title">Cần hỏi lại người gửi</span>
          <div className="metric-value-row">
            <span className="metric-value">{kpi.asked}</span>
            <span className="metric-sub">chưa đủ thông tin</span>
          </div>
        </div>

        <div className="glass-panel metric-card accent-purple">
          <span className="metric-title">Thời gian phản hồi TB</span>
          <div className="metric-value-row">
            <span className="metric-value">{kpi.avgLatencyMs}</span>
            <span className="metric-sub">ms / lần đọc</span>
          </div>
        </div>
      </section>

      {/* Filter and Search Bar */}
      <section className="glass-panel filter-bar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Tìm theo mã yêu cầu (VD: CQ-1) hoặc mô hình..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-pills">
          <button
            onClick={() => setSelectedOutcome("all")}
            className={`filter-pill ${selectedOutcome === "all" ? "active" : ""}`}
          >
            Tất cả ({initialLogs.length})
          </button>
          <button
            onClick={() => setSelectedOutcome("filled")}
            className={`filter-pill ${selectedOutcome === "filled" ? "active" : ""}`}
          >
            ✅ Đã điền ({kpi.filled})
          </button>
          <button
            onClick={() => setSelectedOutcome("asked")}
            className={`filter-pill ${selectedOutcome === "asked" ? "active" : ""}`}
          >
            ⚠️ Hỏi lại ({kpi.asked})
          </button>
          <button
            onClick={() => setSelectedOutcome("not_request")}
            className={`filter-pill ${selectedOutcome === "not_request" ? "active" : ""}`}
          >
            ⚪ Không phải yêu cầu ({kpi.notRequest})
          </button>
          <button
            onClick={() => setSelectedOutcome("failed")}
            className={`filter-pill ${selectedOutcome === "failed" ? "active" : ""}`}
          >
            ❌ Lỗi ({kpi.failed})
          </button>
        </div>
      </section>

      {/* Data Table */}
      <section className="glass-panel table-container">
        {filteredLogs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📂</div>
            <h3 className="empty-title">
              {initialLogs.length === 0 ? "Chưa có lượt ghi nhật ký nào trong Supabase" : "Không tìm thấy bản ghi phù hợp"}
            </h3>
            <p className="empty-desc">
              {initialLogs.length === 0
                ? "Khi nhân viên gửi email đến địa chỉ tiếp nhận của Jira, Rule R1 sẽ gọi Hub (/api/jira/email-intake) để bóc tách thông tin và tự động lưu nhật ký tại đây."
                : "Thử đổi từ khóa tìm kiếm hoặc bấm chọn 'Tất cả' để hiển thị lại danh sách."}
            </p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Mã yêu cầu</th>
                <th>Lần</th>
                <th>Kết quả AI</th>
                <th>Độ tin cậy</th>
                <th>Thông tin trích xuất / Cần bổ sung</th>
                <th>Thời gian xử lý</th>
                <th style={{ textAlign: "right" }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => {
                const confPercent = log.confidence !== null ? Math.round(log.confidence * 100) : null;
                const outputObj = log.output as Record<string, unknown> | null;
                const system = outputObj?.system as string | undefined;

                return (
                  <tr key={log.id}>
                    <td style={{ whiteSpace: "nowrap", color: "var(--text-muted)" }}>
                      {formatDateTime(log.created_at)}
                    </td>
                    <td>
                      <a
                        href={`${jiraBaseUrl}/browse/${log.issue_key}`}
                        target="_blank"
                        rel="noreferrer"
                        className="jira-link"
                        title="Mở yêu cầu trên Jira"
                      >
                        {log.issue_key} ↗
                      </a>
                    </td>
                    <td>
                      <span className="code-pill">#{log.attempt}</span>
                    </td>
                    <td>
                      <span className={`badge badge-${log.outcome}`}>
                        {OUTCOME_LABEL[log.outcome]}
                      </span>
                    </td>
                    <td>
                      {confPercent !== null ? (
                        <div className="confidence-meter">
                          <div className="confidence-bar-bg">
                            <div
                              className="confidence-bar-fill"
                              style={{
                                width: `${confPercent}%`,
                                backgroundColor:
                                  confPercent >= 80 ? "#10b981" : confPercent >= 60 ? "#f59e0b" : "#ef4444",
                              }}
                            />
                          </div>
                          <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>{confPercent}%</span>
                        </div>
                      ) : (
                        <span style={{ color: "var(--text-dim)" }}>—</span>
                      )}
                    </td>
                    <td>
                      {system ? (
                        <span style={{ color: "#e2e8f0" }}>{system}</span>
                      ) : log.missing_fields && log.missing_fields.length > 0 ? (
                        <span style={{ color: "#fbbf24", fontSize: "0.8rem" }}>
                          Thiếu: {log.missing_fields.join(", ")}
                        </span>
                      ) : log.error ? (
                        <span style={{ color: "#f87171", fontSize: "0.8rem" }}>
                          {log.error.slice(0, 45)}...
                        </span>
                      ) : (
                        <span style={{ color: "var(--text-dim)" }}>—</span>
                      )}
                    </td>
                    <td>
                      {log.latency_ms !== null ? (
                        <span className="code-pill">{log.latency_ms} ms</span>
                      ) : (
                        <span style={{ color: "var(--text-dim)" }}>—</span>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: "0.3rem 0.65rem", fontSize: "0.78rem" }}
                      >
                        🔍 Chi tiết
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* Modal Dialog for Log Details */}
      {selectedLog && (
        <div className="modal-overlay" onClick={() => setSelectedLog(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <span className={`badge badge-${selectedLog.outcome}`}>
                  {OUTCOME_LABEL[selectedLog.outcome]}
                </span>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 600 }}>
                  Yêu cầu: {selectedLog.issue_key} (Lần #{selectedLog.attempt})
                </h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="btn btn-secondary btn-sm"
                style={{ padding: "0.2rem 0.5rem", borderRadius: "50%" }}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Thời gian tiếp nhận</span>
                  <span className="info-value">{formatDateTime(selectedLog.created_at)}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Mô hình AI</span>
                  <span className="info-value code-pill" style={{ width: "fit-content" }}>{selectedLog.model}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Độ tin cậy</span>
                  <span className="info-value">
                    {selectedLog.confidence !== null ? `${Math.round(selectedLog.confidence * 100)}%` : "Không có"}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Thời gian phản hồi</span>
                  <span className="info-value">
                    {selectedLog.latency_ms !== null ? `${selectedLog.latency_ms} ms` : "—"}
                  </span>
                </div>
                <div className="info-item" style={{ gridColumn: "span 2" }}>
                  <span className="info-label">Hash nội dung đầu vào</span>
                  <span className="info-value code-pill" style={{ wordBreak: "break-all" }}>
                    {selectedLog.input_hash}
                  </span>
                </div>
                {selectedLog.error && (
                  <div className="info-item" style={{ gridColumn: "span 2" }}>
                    <span className="info-label" style={{ color: "#f87171" }}>Chi tiết lỗi</span>
                    <span className="info-value" style={{ color: "#fca5a5", fontSize: "0.85rem" }}>
                      {selectedLog.error}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <span className="info-label">Dữ liệu trích xuất (JSON Output)</span>
                  <button
                    onClick={() => handleCopyJson(selectedLog.output)}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}
                  >
                    {copied ? "Đã sao chép!" : "📋 Sao chép JSON"}
                  </button>
                </div>
                <pre className="json-box">
                  {JSON.stringify(selectedLog.output ?? { message: "Không có output" }, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
