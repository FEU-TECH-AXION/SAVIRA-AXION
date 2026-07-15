"use client";

import { useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import en from "@/locales/en.json";
import tl from "@/locales/tl.json";

const SKIP_SELECTOR = "script, style, noscript, code, pre, textarea, [data-no-auto-translate]";
const TRANSLATABLE_ATTRIBUTES = ["aria-label", "title", "placeholder", "alt"];
const originals = new WeakMap();
const attrOriginals = new WeakMap();

const TEXT_TRANSLATIONS = Object.entries(en).reduce((acc, [key, value]) => {
  if (typeof value === "string" && typeof tl[key] === "string") {
    acc[normalizeLookupKey(value)] = tl[key];
  }
  return acc;
}, {});

Object.entries(tl).forEach(([key, value]) => {
  if (typeof value === "string" && !TEXT_TRANSLATIONS[key]) {
    TEXT_TRANSLATIONS[normalizeLookupKey(key)] = value;
  }
});

function normalizeLookupKey(value) {
  return String(value || "")
    .replaceAll("&apos;", "'")
    .replaceAll("&#39;", "'")
    .replaceAll("&rsquo;", "'")
    .replaceAll("&lsquo;", "'")
    .replaceAll("&amp;", "&")
    .replaceAll("&mdash;", "-")
    .replaceAll("&ndash;", "-")
    .replace(/\s+/g, " ")
    .trim();
}

function translateValue(value) {
  const text = String(value || "");
  const trimmed = normalizeLookupKey(text);
  if (!trimmed) return value;

  let translated = TEXT_TRANSLATIONS[trimmed];
  if (!translated) {
    const prefix = Object.keys(TEXT_TRANSLATIONS)
      .filter((key) => trimmed.startsWith(`${key} `))
      .sort((a, b) => b.length - a.length)[0];

    if (prefix) {
      translated = `${TEXT_TRANSLATIONS[prefix]} ${trimmed.slice(prefix.length).trim()}`;
    }
  }

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

  const current = node.nodeValue;
  const stored = originals.get(node);
  const translatedStored = stored ? translateValue(stored) : null;

  if (!originals.has(node) || (current !== stored && current !== translatedStored)) {
    originals.set(node, current);
  }

  const original = originals.get(node);
  const nextValue = language === "tl" ? translateValue(original) : original;
  if (node.nodeValue !== nextValue) {
    const parentOption = node.parentElement?.tagName === "OPTION" ? node.parentElement : null;
    if (parentOption && !parentOption.hasAttribute("value")) {
      const optionValue = String(original || "").trim();
      if (optionValue) {
        parentOption.setAttribute("value", optionValue);
      }
    }

    node.nodeValue = nextValue;
  }
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

    const current = element.getAttribute(attribute);
    const original = stored[attribute];
    const translatedOriginal = original ? translateValue(original) : null;

    if (
      !Object.prototype.hasOwnProperty.call(stored, attribute) ||
      (current !== original && current !== translatedOriginal)
    ) {
      stored[attribute] = current;
    }

    const nextValue = language === "tl" ? translateValue(stored[attribute]) : stored[attribute];
    if (current !== nextValue) {
      element.setAttribute(attribute, nextValue);
    }
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
    document.documentElement.lang = language;
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
