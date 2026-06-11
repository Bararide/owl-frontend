import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
    Box,
    Typography,
    IconButton,
    Tooltip,
    Button,
    Dialog,
} from "@mui/material";
import {
    Close as CloseIcon,
    CheckCircle as CheckCircleIcon,
    FormatBold as FormatBoldIcon,
    FormatItalic as FormatItalicIcon,
    FormatListBulleted as FormatListBulletedIcon,
    Link as LinkIcon,
    Code as CodeIcon,
    Title as TitleIcon,
} from "@mui/icons-material";
import { MarkdownRenderer } from "./../files/MarkdownRenderer";

interface CreateFileDialogProps {
    open: boolean;
    onClose: () => void;
    onCreate: (fileName: string, content: string) => Promise<void>;
    defaultContent?: string;
}

export const CreateFileDialog: React.FC<CreateFileDialogProps> = ({
    open,
    onClose,
    onCreate,
    defaultContent,
}) => {
    const [fileName, setFileName] = useState("");
    const [content, setContent] = useState(defaultContent || "");
    const [isCreating, setIsCreating] = useState(false);

    const contentRef = useRef<HTMLTextAreaElement>(null);
    const titleRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (open) {
            setFileName("");
            setContent(defaultContent || "");
            setIsCreating(false);
            setTimeout(() => {
                titleRef.current?.focus();
                titleRef.current?.select();
            }, 100);
        }
    }, [open, defaultContent]);

    const handleCreate = useCallback(async () => {
        console.log("handleCreate called", { fileName: fileName.trim(), isCreating });
        if (!fileName.trim() || isCreating) {
            console.log("handleCreate aborted: empty fileName or isCreating");
            return;
        }
        setIsCreating(true);
        try {
            const finalName = fileName.trim().endsWith(".md")
                ? fileName.trim()
                : `${fileName.trim()}.md`;
            console.log("Calling onCreate with", { finalName, contentLength: content.length });
            await onCreate(finalName, content);
            console.log("onCreate succeeded, closing dialog");
            onClose();
        } catch (error) {
            console.error("Failed to create file:", error);
            alert(`Ошибка при создании файла: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsCreating(false);
        }
    }, [fileName, content, onCreate, onClose, isCreating]);

    const insertMarkdown = useCallback((prefix: string, suffix: string = "", placeholder: string = "") => {
        const textarea = contentRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = content.substring(start, end);
        const textToInsert = selectedText || placeholder;

        const newContent =
            content.substring(0, start) +
            prefix +
            textToInsert +
            suffix +
            content.substring(end);

        setContent(newContent);

        setTimeout(() => {
            textarea.focus();
            const newCursorPos = start + prefix.length + textToInsert.length;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    }, [content]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === "Tab" && e.target === contentRef.current) {
                e.preventDefault();
                const target = e.target as HTMLTextAreaElement;
                const start = target.selectionStart;
                const end = target.selectionEnd;
                const newValue = content.substring(0, start) + "  " + content.substring(end);
                setContent(newValue);
                setTimeout(() => {
                    target.selectionStart = target.selectionEnd = start + 2;
                }, 0);
                return;
            }

            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                e.preventDefault();
                handleCreate();
            }
            if (e.key === "Escape") {
                e.preventDefault();
                onClose();
            }
            if (e.key === "Enter" && e.target === titleRef.current) {
                e.preventDefault();
                contentRef.current?.focus();
            }
        },
        [handleCreate, onClose, content],
    );

    const stats = useMemo(() => {
        const lines = content.split("\n").length;
        const words = content.trim() ? content.trim().split(/\s+/).length : 0;
        const chars = content.length;
        return { lines, words, chars };
    }, [content]);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullScreen
            PaperProps={{
                sx: {
                    bgcolor: "#1e1e1e",
                    color: "#dcddde",
                    borderRadius: 0,
                },
            }}
            onKeyDown={handleKeyDown}
        >
            <Box
                sx={{
                    height: "100vh",
                    display: "flex",
                    flexDirection: "column",
                    bgcolor: "#1e1e1e",
                }}
            >
                <Box
                    sx={{
                        height: 64,
                        flexShrink: 0,
                        bgcolor: "#252526",
                        borderBottom: "1px solid #333",
                        display: "flex",
                        alignItems: "center",
                        px: 4,
                        gap: 3,
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                        <Typography sx={{ color: "rgba(255,255,255,0.4)", fontSize: "14px", fontWeight: 500 }}>
                            Название:
                        </Typography>
                        <input
                            ref={titleRef}
                            type="text"
                            value={fileName}
                            onChange={(e) => setFileName(e.target.value)}
                            disabled={isCreating}
                            placeholder="Новый документ"
                            spellCheck={false}
                            style={{
                                flex: 1,
                                maxWidth: 400,
                                background: "rgba(255,255,255,0.05)",
                                border: "1px solid transparent",
                                borderRadius: 6,
                                outline: "none",
                                fontSize: "15px",
                                fontWeight: 500,
                                color: "#dcddde",
                                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                                padding: "8px 12px",
                                caretColor: "#7c5cbf",
                                transition: "all 0.2s",
                            }}
                            onFocus={(e) => e.target.style.borderColor = "#7c5cbf"}
                            onBlur={(e) => e.target.style.borderColor = "transparent"}
                        />
                        {!fileName.trim().endsWith(".md") && fileName.trim().length > 0 && (
                            <Typography sx={{ color: "rgba(255,255,255,0.3)", fontSize: "14px", fontFamily: "monospace" }}>
                                .md
                            </Typography>
                        )}
                    </Box>

                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <IconButton
                            size="medium"
                            onClick={onClose}
                            disabled={isCreating}
                            sx={{
                                color: "rgba(255,255,255,0.5)",
                                "&:hover": { bgcolor: "rgba(255,255,255,0.08)", color: "#fff" },
                            }}
                        >
                            <CloseIcon />
                        </IconButton>
                        <Tooltip title={!fileName.trim() ? "Введите имя файла" : ""}>
                            <span>
                                <Button
                                    onClick={handleCreate}
                                    disabled={!fileName.trim() || isCreating}
                                    variant="contained"
                                    size="medium"
                                    startIcon={<CheckCircleIcon sx={{ fontSize: 20 }} />}
                                    sx={{
                                        textTransform: "none",
                                        fontWeight: 600,
                                        fontSize: "14px",
                                        bgcolor: "#7c5cbf",
                                        color: "#fff",
                                        px: 3,
                                        height: 40,
                                        borderRadius: 2,
                                        boxShadow: "none",
                                        "&:hover": { bgcolor: "#6b4fa8", boxShadow: "none" },
                                        "&.Mui-disabled": {
                                            bgcolor: "rgba(255,255,255,0.08)",
                                            color: "rgba(255,255,255,0.3)",
                                        },
                                    }}
                                >
                                    {isCreating ? "Создание..." : "Создать файл"}
                                </Button>
                            </span>
                        </Tooltip>
                    </Box>
                </Box>

                <Box sx={{ flex: 1, display: "flex", overflow: "hidden" }}>
                    <Box
                        sx={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            borderRight: "1px solid #333",
                            bgcolor: "#1e1e1e",
                            position: "relative",
                        }}
                    >
                        <Box
                            sx={{
                                height: 44,
                                flexShrink: 0,
                                display: "flex",
                                alignItems: "center",
                                px: 2,
                                gap: 0.5,
                                borderBottom: "1px solid rgba(255,255,255,0.05)",
                                bgcolor: "#1e1e1e",
                            }}
                        >
                            <Tooltip title="Заголовок">
                                <IconButton size="small" onClick={() => insertMarkdown("## ", "", "Заголовок")} sx={{ color: "rgba(255,255,255,0.6)", p: 1, "&:hover": { bgcolor: "rgba(255,255,255,0.08)", color: "#fff" } }}>
                                    <TitleIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Жирный">
                                <IconButton size="small" onClick={() => insertMarkdown("**", "**", "жирный")} sx={{ color: "rgba(255,255,255,0.6)", p: 1, "&:hover": { bgcolor: "rgba(255,255,255,0.08)", color: "#fff" } }}>
                                    <FormatBoldIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Курсив">
                                <IconButton size="small" onClick={() => insertMarkdown("*", "*", "курсив")} sx={{ color: "rgba(255,255,255,0.6)", p: 1, "&:hover": { bgcolor: "rgba(255,255,255,0.08)", color: "#fff" } }}>
                                    <FormatItalicIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                            </Tooltip>
                            <Box sx={{ width: 1, height: 20, bgcolor: "rgba(255,255,255,0.1)", mx: 1 }} />
                            <Tooltip title="Список">
                                <IconButton size="small" onClick={() => insertMarkdown("- ", "", "Пункт")} sx={{ color: "rgba(255,255,255,0.6)", p: 1, "&:hover": { bgcolor: "rgba(255,255,255,0.08)", color: "#fff" } }}>
                                    <FormatListBulletedIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Ссылка">
                                <IconButton size="small" onClick={() => insertMarkdown("[", "](url)", "текст")} sx={{ color: "rgba(255,255,255,0.6)", p: 1, "&:hover": { bgcolor: "rgba(255,255,255,0.08)", color: "#fff" } }}>
                                    <LinkIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Код">
                                <IconButton size="small" onClick={() => insertMarkdown("`", "`", "код")} sx={{ color: "rgba(255,255,255,0.6)", p: 1, "&:hover": { bgcolor: "rgba(255,255,255,0.08)", color: "#fff" } }}>
                                    <CodeIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                            </Tooltip>
                        </Box>

                        <Box sx={{ flex: 1, overflow: "auto", position: "relative" }}>
                            <textarea
                                ref={contentRef}
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                disabled={isCreating}
                                placeholder="Начните писать здесь..."
                                spellCheck={false}
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    background: "transparent",
                                    border: "none",
                                    outline: "none",
                                    resize: "none",
                                    fontFamily: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
                                    fontSize: "15px",
                                    lineHeight: 1.7,
                                    color: "#d4d4d4",
                                    caretColor: "#7c5cbf",
                                    padding: "24px 32px",
                                    letterSpacing: "0.01em",
                                    whiteSpace: "pre-wrap",
                                    wordBreak: "break-word",
                                }}
                            />
                        </Box>
                    </Box>

                    <Box
                        sx={{
                            flex: 1,
                            overflow: "auto",
                            bgcolor: "#252526",
                            display: "flex",
                            flexDirection: "column",
                        }}
                    >
                        <Box
                            sx={{
                                height: 44,
                                flexShrink: 0,
                                display: "flex",
                                alignItems: "center",
                                px: 3,
                                borderBottom: "1px solid rgba(255,255,255,0.05)",
                                bgcolor: "#252526",
                            }}
                        >
                            <Typography sx={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                Предпросмотр
                            </Typography>
                        </Box>

                        <Box sx={{ flex: 1, p: 4, overflow: "auto" }}>
                            {content.trim() === "" ? (
                                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", opacity: 0.3 }}>
                                    <Typography sx={{ fontStyle: "italic", fontSize: "16px" }}>
                                        Начните печатать слева, чтобы увидеть результат здесь
                                    </Typography>
                                </Box>
                            ) : (
                                <MarkdownRenderer content={content} />
                            )}
                        </Box>
                    </Box>
                </Box>

                <Box
                    sx={{
                        height: 28,
                        flexShrink: 0,
                        bgcolor: "#7c5cbf",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        px: 3,
                    }}
                >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
                        <Typography sx={{ color: "rgba(255,255,255,0.9)", fontSize: "12px", fontWeight: 500 }}>
                            {stats.words} {stats.words === 1 ? "слово" : stats.words < 5 ? "слова" : "слов"}
                        </Typography>
                        <Typography sx={{ color: "rgba(255,255,255,0.7)", fontSize: "12px" }}>
                            {stats.chars.toLocaleString()} символов
                        </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <Typography sx={{ color: "rgba(255,255,255,0.7)", fontSize: "12px" }}>
                            Markdown
                        </Typography>
                        <Typography sx={{ color: "rgba(255,255,255,0.9)", fontSize: "12px", fontWeight: 500 }}>
                            UTF-8
                        </Typography>
                    </Box>
                </Box>
            </Box>
        </Dialog>
    );
};