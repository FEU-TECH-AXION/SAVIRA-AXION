"use client";

import { useMemo, useState } from "react";
import styles from "./ViewCase.module.css";
import { PUBLIC_UPDATE_TEMPLATES } from "./publicUpdateTemplates";

const MAX_PUBLIC_MESSAGE_LENGTH = 280;

export default function PublicMessageField({ actionType, contextFields = {}, value, onChange }) {
  const templates = useMemo(() => PUBLIC_UPDATE_TEMPLATES[actionType] || [], [actionType]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const isPublic = Boolean(value?.isPublic);
  const publicMessage = value?.publicMessage || "";

  function setVisible(checked) {
    if (!checked) setSelectedTemplate("");
    onChange({
      isPublic: checked,
      publicMessage: checked ? publicMessage : "",
    });
  }

  function chooseTemplate(templateId) {
    setSelectedTemplate(templateId);
    const template = templates.find((item) => item.id === templateId);
    if (template?.build) {
      onChange({
        isPublic: true,
        publicMessage: template.build(contextFields).slice(0, MAX_PUBLIC_MESSAGE_LENGTH),
      });
    }
  }

  function setMessage(nextMessage) {
    onChange({
      isPublic: true,
      publicMessage: nextMessage.slice(0, MAX_PUBLIC_MESSAGE_LENGTH),
    });
  }

  return (
    <div className={styles.publicMessageBox}>
      <label className={styles.checkLabel}>
        <input
          className={styles.checkInput}
          type="checkbox"
          checked={isPublic}
          onChange={(event) => setVisible(event.target.checked)}
        />
        Visible to complainant in their case updates
      </label>

      {isPublic && (
        <div className={styles.publicMessageFields}>
          <select
            className={styles.formInput}
            value={selectedTemplate}
            onChange={(event) => chooseTemplate(event.target.value)}
          >
            <option value="">Select message template</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>{template.label}</option>
            ))}
          </select>
          <textarea
            className={styles.formInput}
            rows={3}
            maxLength={MAX_PUBLIC_MESSAGE_LENGTH}
            value={publicMessage}
            onChange={(event) => setMessage(event.target.value)}
          />
          <div className={styles.publicMessageMeta}>
            <span>This is exactly what the complainant will see.</span>
            <span>{publicMessage.length}/{MAX_PUBLIC_MESSAGE_LENGTH}</span>
          </div>
        </div>
      )}
    </div>
  );
}
