"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./Tooltip.module.css";

const EDGE_PADDING = 12;
const GAP = 8;
const HALF_TOOLTIP_WIDTH = 120;
const HALF_TOOLTIP_HEIGHT = 50;

function getPosition(rect, requestedPosition) {
  let position = requestedPosition;

  if (position === "top" && rect.top < 100) position = "bottom";
  if (position === "bottom" && window.innerHeight - rect.bottom < 100) {
    position = "top";
  }
  if (position === "left" && rect.left < 260) position = "right";
  if (position === "right" && window.innerWidth - rect.right < 260) {
    position = "left";
  }

  if (position === "left") {
    return {
      position,
      left: rect.left - GAP,
      top: Math.min(
        window.innerHeight - EDGE_PADDING - HALF_TOOLTIP_HEIGHT,
        Math.max(
          EDGE_PADDING + HALF_TOOLTIP_HEIGHT,
          rect.top + rect.height / 2
        )
      ),
    };
  }

  if (position === "right") {
    return {
      position,
      left: rect.right + GAP,
      top: Math.min(
        window.innerHeight - EDGE_PADDING - HALF_TOOLTIP_HEIGHT,
        Math.max(
          EDGE_PADDING + HALF_TOOLTIP_HEIGHT,
          rect.top + rect.height / 2
        )
      ),
    };
  }

  return {
    position,
    left: Math.min(
      window.innerWidth - EDGE_PADDING - HALF_TOOLTIP_WIDTH,
      Math.max(
        EDGE_PADDING + HALF_TOOLTIP_WIDTH,
        rect.left + rect.width / 2
      )
    ),
    top: position === "bottom" ? rect.bottom + GAP : rect.top - GAP,
  };
}

export default function Tooltip({ text, children, position = "top" }) {
  const triggerRef = useRef(null);
  const [tooltipPosition, setTooltipPosition] = useState(null);

  function showTooltip() {
    if (!triggerRef.current) return;
    setTooltipPosition(
      getPosition(triggerRef.current.getBoundingClientRect(), position)
    );
  }

  function hideTooltip() {
    setTooltipPosition(null);
  }

  useEffect(() => {
    if (!tooltipPosition) return undefined;

    const dismiss = () => setTooltipPosition(null);
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);

    return () => {
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
    };
  }, [tooltipPosition]);

  return (
    <>
      <span
        ref={triggerRef}
        className={styles.wrapper}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocusCapture={showTooltip}
        onBlurCapture={hideTooltip}
      >
        {children}
      </span>
      {tooltipPosition &&
        createPortal(
          <span
            className={`${styles.tooltip} ${
              styles[tooltipPosition.position]
            }`}
            style={{
              left: tooltipPosition.left,
              top: tooltipPosition.top,
            }}
            role="tooltip"
          >
            {text}
          </span>,
          document.body
        )}
    </>
  );
}
