"use client";

import { useEffect, useState, useTransition } from "react";
import { X } from "lucide-react";
import type {
  ContentStatus,
  ContentType,
} from "@prisma/client";
import { createContentAction } from "../actions";

interface ContentFormDialogProps {
  open: boolean;
  onClose: () => void;
}

const CONTENT_TYPES: Array<{
  value: ContentType;
  label: string;
}> = [
  { value: "REEL", label: "Reel" },
  { value: "POST", label: "Post" },
  { value: "CAROUSEL", label: "Carousel" },
  { value: "STORY", label: "Story" },
  { value: "LONG_VIDEO", label: "Long Video" },
];

const CONTENT_STATUSES: Array<{
  value: ContentStatus;
  label: string;
}> = [
  { value: "IDEA", label: "Idea" },
  { value: "SCRIPT", label: "Script" },
  { value: "SHOT", label: "Shot" },
  { value: "EDITING", label: "Editing" },
  { value: "READY", label: "Ready" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "PUBLISHED", label: "Published" },
];

export function ContentFormDialog({
  open,
  onClose,
}: ContentFormDialogProps) {
  const [title, setTitle] = useState("");
  const [contentType, setContentType] =
    useState<ContentType>("REEL");
  const [status, setStatus] =
    useState<ContentStatus>("IDEA");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;

    setTitle("");
    setContentType("REEL");
    setStatus("IDEA");
    setNotes("");
    setError(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isPending) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, isPending, onClose]);

  if (!open) {
    return null;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (title.trim().length < 2) {
      setError("Title must be at least 2 characters.");
      return;
    }

    startTransition(async () => {
      const result = await createContentAction({
        title: title.trim(),
        contentType,
        status,
        notes: notes.trim() || null,
      });

      if (!result.success) {
        setError(result.error ?? "Unable to create content.");
        return;
      }

      onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !isPending
        ) {
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="content-dialog-title"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
              Marketing
            </p>

            <h2
              id="content-dialog-title"
              className="mt-1 text-lg font-semibold text-text-primary"
            >
              Add Content
            </h2>

            <p className="mt-1 text-sm text-text-secondary">
              Create a content item to track through your workflow.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg p-2 text-text-muted transition hover:bg-surface-muted hover:text-text-secondary disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-5 px-6 py-6">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="content-title"
                className="mb-2 block text-sm font-medium text-text-secondary"
              >
                Title
              </label>

              <input
                id="content-title"
                type="text"
                value={title}
                onChange={(event) =>
                  setTitle(event.target.value)
                }
                placeholder="e.g. Oily Skin ≠ Dirty Skin"
                maxLength={200}
                required
                autoFocus
                className="w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="content-type"
                  className="mb-2 block text-sm font-medium text-text-secondary"
                >
                  Content Type
                </label>

                <select
                  id="content-type"
                  value={contentType}
                  onChange={(event) =>
                    setContentType(
                      event.target.value as ContentType
                    )
                  }
                  className="w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 text-sm text-text-primary outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                >
                  {CONTENT_TYPES.map((type) => (
                    <option
                      key={type.value}
                      value={type.value}
                    >
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="content-status"
                  className="mb-2 block text-sm font-medium text-text-secondary"
                >
                  Status
                </label>

                <select
                  id="content-status"
                  value={status}
                  onChange={(event) =>
                    setStatus(
                      event.target.value as ContentStatus
                    )
                  }
                  className="w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 text-sm text-text-primary outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                >
                  {CONTENT_STATUSES.map((item) => (
                    <option
                      key={item.value}
                      value={item.value}
                    >
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="content-notes"
                className="mb-2 block text-sm font-medium text-text-secondary"
              >
                Notes
              </label>

              <textarea
                id="content-notes"
                value={notes}
                onChange={(event) =>
                  setNotes(event.target.value)
                }
                placeholder="Optional notes about the content..."
                maxLength={1000}
                rows={5}
                className="w-full resize-none rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border bg-surface-muted/60 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-xl border border-border bg-surface-raised px-4 py-2.5 text-sm font-semibold text-text-secondary transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isPending}
              className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Creating..." : "Create Content"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}