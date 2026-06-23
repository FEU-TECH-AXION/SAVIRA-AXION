const COLORS = {
  Pending: ["#f3f4f6", "#374151"],
  "In Progress": ["#dbeafe", "#1d4ed8"],
  Completed: ["#dcfce7", "#166534"],
  Overdue: ["#fee2e2", "#991b1b"],
  Cancelled: ["#ffedd5", "#9a3412"],
}

export default function TaskStatusBadge({ status }) {
  const [background, color] = COLORS[status] || COLORS.Pending
  return (
    <span style={{
      display: "inline-flex", padding: "4px 10px", borderRadius: 999,
      background, color, fontSize: "0.75rem", fontWeight: 700,
    }}>
      {status}
    </span>
  )
}
