import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Send,
  Paperclip,
  Image as ImageIcon,
  X,
  Loader2,
  Pencil,
  Reply,
} from 'lucide-react';
import { filesAPI } from '@/services/api/popApi';

const MAX_LENGTH = 5000;

/* =========================================================
   Helpers
========================================================= */

const getErrorMessage = (
  error,
  fallback = 'Something went wrong.'
) => {
  if (!error) {
    return fallback;
  }

  if (typeof error === 'string') {
    return error;
  }

  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.data?.message ||
    error?.data?.error ||
    error?.message ||
    fallback
  );
};

const getUploadUrl = (response) =>
  response?.data?.url ||
  response?.data?.file_url ||
  response?.data?.fileUrl ||
  response?.url ||
  response?.file_url ||
  response?.fileUrl ||
  null;

const getUploadName = (response, file) =>
  response?.data?.name ||
  response?.data?.file_name ||
  response?.data?.filename ||
  response?.name ||
  response?.file_name ||
  response?.filename ||
  file?.name ||
  'Attachment';

const getUploadSize = (response, file) =>
  response?.data?.size ||
  response?.data?.file_size ||
  response?.size ||
  response?.file_size ||
  file?.size ||
  0;

/* =========================================================
   Attachment Preview
========================================================= */

function AttachmentPreview({
  attachment,
  onRemove,
}) {
  if (!attachment) return null;

  const isImage =
    attachment.type === 'image';

  return (
    <div
      className="
        flex
        min-w-0
        items-center
        gap-3
        rounded-2xl
        border
        border-ink-200
        bg-white
        px-3
        py-2
        shadow-xs
      "
    >
      <div className="shrink-0">
        {isImage && attachment.previewUrl ? (
          <img
            src={attachment.previewUrl}
            alt={
              attachment.name ||
              'Attachment preview'
            }
            className="
              h-11
              w-11
              rounded-xl
              border
              border-ink-100
              object-cover
            "
          />
        ) : (
          <div
            className="
              flex
              h-11
              w-11
              items-center
              justify-center
              rounded-xl
              bg-primary-50
              text-primary-600
            "
          >
            <Paperclip className="h-5 w-5" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-ink-800">
          {attachment.name || 'Attachment'}
        </p>

        <div className="mt-0.5 flex items-center gap-2 text-xs text-ink-400">
          <span>
            {attachment.uploading
              ? 'Uploading…'
              : attachment.size
                ? `${Math.max(
                    1,
                    Math.round(
                      attachment.size / 1024
                    )
                  )} KB`
                : 'Ready'}
          </span>

          {attachment.uploading && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary-500" />
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onRemove}
        disabled={attachment.uploading}
        className="
          flex
          h-8
          w-8
          shrink-0
          items-center
          justify-center
          rounded-xl
          text-ink-400
          transition
          hover:bg-ink-100
          hover:text-ink-700
          disabled:cursor-not-allowed
          disabled:opacity-40
        "
        aria-label="Remove attachment"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/* =========================================================
   Message Composer
========================================================= */

export default function MessageComposer({
  conversationId,
  isClosed = false,
  replyTo = null,
  editing = null,
  onCancelReply,
  onCancelEdit,
  onSent,
  onEdited,
  onError,
  onTyping,
  onTypingStop,
  currentUserName,
}) {
  const [content, setContent] =
    useState('');

  const [attachment, setAttachment] =
    useState(null);

  const [sending, setSending] =
    useState(false);

  const textareaRef =
    useRef(null);

  const fileInputRef =
    useRef(null);

  const imageInputRef =
    useRef(null);

  const isEditing =
    Boolean(editing);

  /* ---------------------------------------------------------
     Edit prefill
  --------------------------------------------------------- */

  useEffect(() => {
    if (!editing) return;

    setContent(
      editing?.content || ''
    );

    setAttachment(null);

    requestAnimationFrame(() => {
      textareaRef.current?.focus();

      const length =
        textareaRef.current?.value
          ?.length || 0;

      textareaRef.current?.setSelectionRange(
        length,
        length
      );
    });
  }, [editing]);

  /* ---------------------------------------------------------
     Auto resize
  --------------------------------------------------------- */

  const resizeTextarea =
    useCallback(() => {
      const textarea =
        textareaRef.current;

      if (!textarea) return;

      textarea.style.height = 'auto';

      textarea.style.height = `${Math.min(
        textarea.scrollHeight,
        160
      )}px`;
    }, []);

  useEffect(() => {
    resizeTextarea();
  }, [
    content,
    resizeTextarea,
  ]);

  /* ---------------------------------------------------------
     Safe error callback
  --------------------------------------------------------- */

  const reportError =
    useCallback(
      (
        error,
        fallback = 'Something went wrong.'
      ) => {
        const message =
          getErrorMessage(
            error,
            fallback
          );

        onError?.(message);

        return message;
      },
      [onError]
    );

  /* ---------------------------------------------------------
     Change
  --------------------------------------------------------- */

  const handleChange = (event) => {
    const nextValue =
      event.target.value.slice(
        0,
        MAX_LENGTH
      );

    setContent(nextValue);

    if (nextValue.trim()) {
      onTyping?.(currentUserName);
    } else {
      onTypingStop?.();
    }
  };

  /* ---------------------------------------------------------
     Attachment upload
  --------------------------------------------------------- */

  const uploadAttachment = async (
    file
  ) => {
    if (!file || sending) return;

    const isImage =
      file.type?.startsWith(
        'image/'
      );

    const previewUrl = isImage
      ? URL.createObjectURL(file)
      : null;

    setAttachment({
      localId: `${Date.now()}-${Math.random()}`,
      type: isImage
        ? 'image'
        : 'file',
      name: file.name,
      size: file.size,
      mime: file.type,
      previewUrl,
      uploading: true,
    });

    try {
      const response =
        await filesAPI.uploadDocument(
          file,
          'chat'
        );

      const url =
        getUploadUrl(response);

      if (!url) {
        throw new Error(
          'Upload completed without a file URL.'
        );
      }

      setAttachment({
        localId: `${Date.now()}-${Math.random()}`,
        type: isImage
          ? 'image'
          : 'file',
        name: getUploadName(
          response,
          file
        ),
        size: getUploadSize(
          response,
          file
        ),
        mime: file.type,
        url,
        previewUrl,
        uploading: false,
      });
    } catch (error) {
      if (previewUrl) {
        URL.revokeObjectURL(
          previewUrl
        );
      }

      setAttachment(null);

      reportError(
        error,
        'Failed to upload attachment.'
      );
    }
  };

  const handleFileChange = (
    event
  ) => {
    const file =
      event.target.files?.[0];

    if (file) {
      uploadAttachment(file);
    }

    event.target.value = '';
  };

  /* ---------------------------------------------------------
     Remove attachment
  --------------------------------------------------------- */

  const removeAttachment = () => {
    if (attachment?.previewUrl) {
      URL.revokeObjectURL(
        attachment.previewUrl
      );
    }

    setAttachment(null);
  };

  /* ---------------------------------------------------------
     Submit
  --------------------------------------------------------- */

  const canSend =
    !sending &&
    !attachment?.uploading &&
    Boolean(
      content.trim().length > 0 ||
        attachment?.url
    );

  const handleSubmit = async (
    event
  ) => {
    event?.preventDefault();

    if (
      !canSend ||
      !conversationId
    ) {
      return;
    }

    onTypingStop?.();

    /* -------------------------------------------------------
       Edit
    ------------------------------------------------------- */

    if (isEditing) {
      const trimmed =
        content.trim();

      if (!trimmed) return;

      setSending(true);

      try {
        await onEdited?.(
          editing,
          trimmed
        );

        setContent('');
        setAttachment(null);

        onCancelEdit?.();
      } catch (error) {
        reportError(
          error,
          'Failed to edit message.'
        );
      } finally {
        setSending(false);

        requestAnimationFrame(() => {
          textareaRef.current?.focus();
        });
      }

      return;
    }

    /* -------------------------------------------------------
       New message
    ------------------------------------------------------- */

    const previousContent =
      content;

    const previousAttachment =
      attachment;

    const payload = {
      conversation_id:
        conversationId,
    };

    if (content.trim()) {
      payload.content =
        content.trim();
    }

    if (attachment?.url) {
      payload.attachment = {
        url: attachment.url,
        name: attachment.name,
        size: attachment.size,
        mime: attachment.mime,
        type: attachment.type,
      };
    }

    if (replyTo?.id) {
      payload.reply_to_id =
        replyTo.id;
    }

    setContent('');
    setAttachment(null);
    setSending(true);

    try {
      await onSent?.(payload);

      onCancelReply?.();

      requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
    } catch (error) {
      /*
       * Restore the composer state.
       */
      setContent(
        previousContent
      );

      setAttachment(
        previousAttachment
      );

      /*
       * CRITICAL:
       *
       * Never pass the Error object to React state/UI.
       */
      reportError(
        error,
        'Failed to send message.'
      );
    } finally {
      setSending(false);
    }
  };

  /* ---------------------------------------------------------
     Keyboard
  --------------------------------------------------------- */

  const handleKeyDown = (
    event
  ) => {
    if (event.key === 'Escape') {
      if (isEditing) {
        onCancelEdit?.();
        return;
      }

      if (replyTo) {
        onCancelReply?.();
        return;
      }

      return;
    }

    if (
      event.key === 'Enter' &&
      !event.shiftKey
    ) {
      event.preventDefault();

      handleSubmit(event);
    }
  };

  /* ---------------------------------------------------------
     Closed conversation
  --------------------------------------------------------- */

  if (isClosed) {
    return (
      <div
        className="
          shrink-0
          border-t
          border-ink-200
          bg-white
          px-4
          py-4
        "
      >
        <div
          className="
            flex
            items-center
            justify-center
            gap-2
            rounded-2xl
            border
            border-ink-200
            bg-ink-50
            px-4
            py-3
          "
        >
          <X className="h-4 w-4 text-ink-400" />

          <span className="text-sm font-bold text-ink-500">
            This conversation is closed.
          </span>
        </div>
      </div>
    );
  }

  const remaining =
    MAX_LENGTH -
    content.length;

  const showCharacterCount =
    remaining <= 200;

  return (
    <form
      onSubmit={handleSubmit}
      className="
        relative
        shrink-0
        border-t
        border-ink-200
        bg-white
        px-3
        py-3
        sm:px-4
      "
    >
      <div className="mx-auto max-w-5xl">
        {/* -------------------------------------------------
            Reply banner
        ------------------------------------------------- */}

        {replyTo &&
          !isEditing && (
            <div
              className="
                mb-2
                flex
                items-center
                gap-3
                rounded-2xl
                border
                border-primary-100
                border-l-4
                border-l-primary-500
                bg-primary-50
                px-3
                py-2.5
              "
            >
              <div
                className="
                  flex
                  h-8
                  w-8
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-primary-100
                  text-primary-600
                "
              >
                <Reply className="h-4 w-4" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold uppercase tracking-wide text-primary-700">
                  Replying to
                </p>

                <p className="truncate text-sm font-medium text-ink-600">
                  {replyTo?.content ||
                    replyTo?.message ||
                    'Message'}
                </p>
              </div>

              <button
                type="button"
                onClick={
                  onCancelReply
                }
                className="
                  flex
                  h-8
                  w-8
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  text-ink-400
                  transition
                  hover:bg-white
                  hover:text-ink-700
                "
                aria-label="Cancel reply"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

        {/* -------------------------------------------------
            Edit banner
        ------------------------------------------------- */}

        {isEditing && (
          <div
            className="
              mb-2
              flex
              items-center
              gap-3
              rounded-2xl
              border
              border-primary-100
              border-l-4
              border-l-primary-500
              bg-primary-50
              px-3
              py-2.5
            "
          >
            <div
              className="
                flex
                h-8
                w-8
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-primary-100
                text-primary-600
              "
            >
              <Pencil className="h-4 w-4" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-extrabold uppercase tracking-wide text-primary-700">
                Editing message
              </p>

              <p className="truncate text-sm font-medium text-ink-600">
                Make your changes and send when ready.
              </p>
            </div>

            <button
              type="button"
              onClick={
                onCancelEdit
              }
              className="
                flex
                h-8
                w-8
                shrink-0
                items-center
                justify-center
                rounded-xl
                text-ink-400
                transition
                hover:bg-white
                hover:text-ink-700
              "
              aria-label="Cancel edit"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* -------------------------------------------------
            Attachment
        ------------------------------------------------- */}

        {attachment && (
          <div className="mb-2">
            <AttachmentPreview
              attachment={
                attachment
              }
              onRemove={
                removeAttachment
              }
            />
          </div>
        )}

        {/* -------------------------------------------------
            Composer
        ------------------------------------------------- */}

        <div className="flex items-end gap-2">
          <div className="flex shrink-0 items-center gap-1">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={
                handleFileChange
              }
              disabled={sending}
              accept="*/*"
            />

            <input
              ref={imageInputRef}
              type="file"
              className="hidden"
              onChange={
                handleFileChange
              }
              disabled={sending}
              accept="image/*"
            />

            <button
              type="button"
              onClick={() =>
                fileInputRef.current?.click()
              }
              disabled={
                sending ||
                Boolean(attachment)
              }
              className="
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-xl
                border
                border-ink-200
                bg-white
                text-ink-500
                transition
                hover:border-primary-200
                hover:bg-primary-50
                hover:text-primary-600
                disabled:cursor-not-allowed
                disabled:opacity-40
              "
              aria-label="Attach file"
            >
              <Paperclip className="h-4.5 w-4.5" />
            </button>

            <button
              type="button"
              onClick={() =>
                imageInputRef.current?.click()
              }
              disabled={
                sending ||
                Boolean(attachment)
              }
              className="
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-xl
                border
                border-ink-200
                bg-white
                text-ink-500
                transition
                hover:border-primary-200
                hover:bg-primary-50
                hover:text-primary-600
                disabled:cursor-not-allowed
                disabled:opacity-40
              "
              aria-label="Attach image"
            >
              <ImageIcon className="h-4.5 w-4.5" />
            </button>
          </div>

          <div className="relative min-w-0 flex-1">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={
                handleChange
              }
              onKeyDown={
                handleKeyDown
              }
              disabled={sending}
              rows={1}
              maxLength={
                MAX_LENGTH
              }
              placeholder={
                isEditing
                  ? 'Edit your message…'
                  : 'Write a message…'
              }
              className="
                block
                max-h-40
                min-h-[42px]
                w-full
                resize-none
                overflow-y-auto
                rounded-2xl
                border
                border-ink-200
                bg-ink-50
                px-4
                py-2.5
                text-sm
                font-medium
                leading-6
                text-ink-900
                outline-none
                transition
                placeholder:text-ink-400
                focus:border-primary-300
                focus:bg-white
                focus:ring-2
                focus:ring-primary-100
                disabled:cursor-not-allowed
                disabled:opacity-60
                [scrollbar-width:none]
                [-ms-overflow-style:none]
                [&::-webkit-scrollbar]:hidden
              "
            />
          </div>

          <button
            type="submit"
            disabled={!canSend}
            className="
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-xl
              bg-primary-600
              text-white
              shadow-primary
              transition
              hover:bg-primary-700
              active:scale-95
              disabled:cursor-not-allowed
              disabled:bg-ink-200
              disabled:text-ink-400
              disabled:shadow-none
            "
            aria-label={
              isEditing
                ? 'Save message'
                : 'Send message'
            }
          >
            {sending ? (
              <Loader2 className="h-4.5 w-4.5 animate-spin" />
            ) : (
              <Send className="h-4.5 w-4.5" />
            )}
          </button>
        </div>

        {/* -------------------------------------------------
            Footer
        ------------------------------------------------- */}

        <div className="mt-1.5 flex min-h-4 items-center justify-between px-1">
          <p className="text-[11px] font-medium text-ink-400">
            Press Enter to send · Shift + Enter for a new line
          </p>

          {showCharacterCount && (
            <span
              className={[
                'text-[11px] font-bold',
                remaining === 0
                  ? 'text-red-500'
                  : 'text-ink-400',
              ].join(' ')}
            >
              {content.length}/
              {MAX_LENGTH}
            </span>
          )}
        </div>
      </div>
    </form>
  );
}