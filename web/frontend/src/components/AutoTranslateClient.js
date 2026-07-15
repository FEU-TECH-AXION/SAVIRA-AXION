"use client";

import { useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import tl from "@/locales/tl.json";

const SKIP_SELECTOR = "script, style, noscript, code, pre, textarea, [data-no-auto-translate]";
const TRANSLATABLE_ATTRIBUTES = ["aria-label", "title", "placeholder", "alt"];
const originals = new WeakMap();
const attrOriginals = new WeakMap();

function translateValue(value) {
  const text = String(value || "");
  const trimmed = text.trim();
  if (!trimmed) return value;

  const translated = tl[trimmed];
  if (!translated || translated === trimmed) return value;

  const leading = text.match(/^\s*/)?.[0] || "";
  const trailing = text.match(/\s*$/)?.[0] || "";
  return `${leading}${translated}${trailing}`;
}

function shouldSkip(node) {
  const parent = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
  return !parent || parent.closest(SKIP_SELECTOR);
}

function translateTextNode(node, language) {
  if (shouldSkip(node)) return;

  if (!originals.has(node)) {
    originals.set(node, node.nodeValue);
  }

  const original = originals.get(node);
  node.nodeValue = language === "tl" ? translateValue(original) : original;
}

function translateElementAttributes(element, language) {
  if (shouldSkip(element)) return;

  TRANSLATABLE_ATTRIBUTES.forEach((attribute) => {
    if (!element.hasAttribute(attribute)) return;

    let stored = attrOriginals.get(element);
    if (!stored) {
      stored = {};
      attrOriginals.set(element, stored);
    }

    if (!Object.prototype.hasOwnProperty.call(stored, attribute)) {
      stored[attribute] = element.getAttribute(attribute);
    }

    const original = stored[attribute];
    element.setAttribute(attribute, language === "tl" ? translateValue(original) : original);
  });
}

function translateTree(root, language) {
  if (!root || shouldSkip(root)) return;

  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root, language);
    return;
  }

  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;

  if (root.nodeType === Node.ELEMENT_NODE) {
    translateElementAttributes(root, language);
  }

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
    {
      acceptNode(node) {
        return shouldSkip(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      },
    }
  );

  let node = walker.nextNode();
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) {
      translateTextNode(node, language);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      translateElementAttributes(node, language);
    }
    node = walker.nextNode();
  }
}

export default function AutoTranslateClient() {
  const { language } = useI18n();

  useEffect(() => {
    translateTree(document.body, language);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => translateTree(node, language));
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [language]);

  return null;
}
