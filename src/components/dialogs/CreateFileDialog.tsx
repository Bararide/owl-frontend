import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
    Box,
    Typography,
    IconButton,
    Tooltip,
    Button,
    Dialog,
    Divider,
} from "@mui/material";
import {
    Close as CloseIcon,
    Edit as EditIcon,
    Visibility as VisibilityIcon,
    Description as DescriptionIcon,
    CheckCircle as CheckCircleIcon,
    FormatBold as FormatBoldIcon,
    FormatItalic as FormatItalicIcon,
    FormatListBulleted as FormatListBulletedIcon,
    FormatListNumbered as FormatListNumberedIcon,
    Link as LinkIcon,
    Code as CodeIcon,
    Title as TitleIcon,
    FormatQuote as FormatQuoteIcon,
} from "@mui/icons-material";
import { MarkdownRenderer } from "./../files/MarkdownRenderer";

const DEFAULT_MARKDOWN_TEMPLATE = `Начните писать здесь...

## Математические формулы

Формула в строке: $E = mc^2$

Блочная формула:

$$\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}$$

Уравнение Максвелла:

$$\\nabla \\cdot \\mathbf{E} = \\frac{\\rho}{\\varepsilon_0}$$

Матрица:

$$A = \\begin{pmatrix} a_{11} & a_{12} \\\\ a_{21} & a_{22} \\end{pmatrix}$$

## Формулы

Сумма ряда:

$$\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}$$

Производная:

$$\\frac{d}{dx}\\left(\\int_0^x f(t)\\,dt\\right) = f(x)$$

## Списки

- Первый пункт
- Второй пункт
  - Вложенный пункт
- Третий пункт

## Код

\`\`\`python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

print(fibonacci(10))
\`\`\`

## Таблица

| Параметр | Значение | Единица |
|----------|----------|---------|
| Скорость | 299792458 | м/с     |
| Масса    | 9.109e-31 | кг     |

---

*Курсив*, **жирный**, ~~зачёркнутый~~, \`моноширинный\`
`;

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
    const [content, setContent] = useState(defaultContent || DEFAULT_MARKDOWN_TEMPLATE);
    const [mode, setMode] = useState<"edit" | "preview">("edit");
    const [isCreating, setIsCreating] = useState(false);
    const [cursorLine, setCursorLine] = useState(1);
    const [cursorCol, setCursorCol] = useState(1);
    const contentRef = useRef<HTMLTextAreaElement>(null);
    const titleRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (open) {
            setFileName("");
            setContent(defaultContent || DEFAULT_MARKDOWN_TEMPLATE);
            setMode("edit");
            setIsCreating(false);
            setCursorLine(1);
            setCursorCol(1);
            setTimeout(() => {
                titleRef.current?.focus();
                titleRef.current?.select();
            }, 100);
        }
    }, [open, defaultContent]);

    const handleCreate = useCallback(async () => {
        if (!fileName.trim() || isCreating) return;
        setIsCreating(true);
        try {
            const finalName = fileName.trim().endsWith(".md")
                ? fileName.trim()
                : `${fileName.trim()}.md`;
            await onCreate(finalName, content);
            onClose();
        } catch (error) {
            console.error("Failed to create file:", error);
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

    const handleBold = useCallback(() => insertMarkdown("**", "**", "жирный текст"), [insertMarkdown]);
    const handleItalic = useCallback(() => insertMarkdown("*", "*", "курсив"), [insertMarkdown]);
    const handleHeading = useCallback(() => insertMarkdown("## ", "", "Заголовок"), [insertMarkdown]);
    const handleQuote = useCallback(() => insertMarkdown("> ", "", "Цитата"), [insertMarkdown]);
    const handleBulletList = useCallback(() => insertMarkdown("- ", "", "Пункт списка"), [insertMarkdown]);
    const handleNumberedList = useCallback(() => insertMarkdown("1. ", "", "Пункт списка"), [insertMarkdown]);
    const handleLink = useCallback(() => insertMarkdown("[", "](url)", "текст ссылки"), [insertMarkdown]);
    const handleCode = useCallback(() => insertMarkdown("`", "`", "код"), [insertMarkdown]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && (e.key === "Enter" || e.key === "s")) {
                e.preventDefault();
                handleCreate();
            }
            if (e.key === "Escape") {
                e.preventDefault();
                onClose();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === "/") {
                e.preventDefault();
                setMode((m) => (m === "edit" ? "preview" : "edit"));
            }
            if ((e.ctrlKey || e.metaKey) && e.key === "b") {
                e.preventDefault();
                handleBold();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === "i") {
                e.preventDefault();
                handleItalic();
            }
            if (e.key === "Enter" && e.target === titleRef.current) {
                e.preventDefault();
                contentRef.current?.focus();
            }
        },
        [handleCreate, onClose, handleBold, handleItalic],
    );

    const handleContentKeyUp = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        const target = e.currentTarget;
        const text = target.value.substring(0, target.selectionStart);
        const lines = text.split("\n");
        setCursorLine(lines.length);
        setCursorCol(lines[lines.length - 1].length + 1);
    }, []);

    const handleContentClick = useCallback((e: React.MouseEvent<HTMLTextAreaElement>) => {
        const target = e.currentTarget;
        const text = target.value.substring(0, target.selectionStart);
        const lines = text.split("\n");
        setCursorLine(lines.length);
        setCursorCol(lines[lines.length - 1].length + 1);
    }, []);

    const stats = useMemo(() => {
        const lines = content.split("\n").length;
        const words = content.trim() ? content.trim().split(/\s+/).length : 0;
        const chars = content.length;
        return { lines, words, chars };
    }, [content]);

    const displayTitle = fileName.trim() || "Новый документ";

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullScreen
            PaperProps={{
                sx: {
                    bgcolor: "#1e1e1e",
                    color: "#dcddde",
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
                {/* Верхняя панель с вкладкой */}
                <Box
                    sx={{
                        height: 40,
                        flexShrink: 0,
                        bgcolor: "#262626",
                        borderBottom: "1px solid #333",
                        display: "flex",
                        alignItems: "flex-end",
                        px: 1,
                        gap: 0.5,
                    }}
                >
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            height: 34,
                            px: 2,
                            gap: 1.5,
                            bgcolor: "#1e1e1e",
                            borderRadius: "6px 6px 0 0",
                            borderLeft: "1px solid #333",
                            borderRight: "1px solid #333",
                            borderTop: "1px solid #333",
                            borderBottom: "1px solid #1e1e1e",
                            maxWidth: 320,
                            mb: "-1px",
                        }}
                    >
                        <DescriptionIcon sx={{ fontSize: 16, color: "#7c5cbf", flexShrink: 0 }} />
                        <Typography
                            sx={{
                                fontSize: "13px",
                                color: "#dcddde",
                                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                                fontWeight: 500,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                flex: 1,
                            }}
                        >
                            {displayTitle}
                        </Typography>
                        <IconButton
                            size="small"
                            onClick={onClose}
                            disabled={isCreating}
                            sx={{
                                p: 0.25,
                                color: "rgba(255,255,255,0.4)",
                                "&:hover": {
                                    color: "#fff",
                                    bgcolor: "rgba(255,255,255,0.08)",
                                },
                            }}
                        >
                            <CloseIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                    </Box>

                    <Box sx={{ flex: 1 }} />

                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            pb: 0.5,
                            pr: 2,
                        }}
                    >
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                bgcolor: "#1a1a1a",
                                borderRadius: 1,
                                p: 0.5,
                                border: "1px solid #333",
                                gap: 0.25,
                            }}
                        >
                            <Tooltip title="Режим редактирования (⌘/)">
                                <IconButton
                                    size="small"
                                    onClick={() => setMode("edit")}
                                    sx={{
                                        p: 0.75,
                                        color: mode === "edit" ? "#dcddde" : "rgba(255,255,255,0.4)",
                                        bgcolor: mode === "edit" ? "#333" : "transparent",
                                        "&:hover": { bgcolor: mode === "edit" ? "#333" : "rgba(255,255,255,0.06)" },
                                    }}
                                >
                                    <EditIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Режим чтения (⌘/)">
                                <IconButton
                                    size="small"
                                    onClick={() => setMode("preview")}
                                    sx={{
                                        p: 0.75,
                                        color: mode === "preview" ? "#dcddde" : "rgba(255,255,255,0.4)",
                                        bgcolor: mode === "preview" ? "#333" : "transparent",
                                        "&:hover": { bgcolor: mode === "preview" ? "#333" : "rgba(255,255,255,0.06)" },
                                    }}
                                >
                                    <VisibilityIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                            </Tooltip>
                        </Box>

                        <Button
                            onClick={handleCreate}
                            disabled={!fileName.trim() || isCreating}
                            variant="contained"
                            size="small"
                            startIcon={isCreating ? null : <CheckCircleIcon sx={{ fontSize: 16 }} />}
                            sx={{
                                textTransform: "none",
                                fontWeight: 600,
                                fontSize: "13px",
                                bgcolor: "#7c5cbf",
                                color: "#fff",
                                px: 3,
                                height: 32,
                                ml: 0.5,
                                borderRadius: 2,
                                "&:hover": { bgcolor: "#6b4fa8" },
                                "&.Mui-disabled": {
                                    bgcolor: "rgba(255,255,255,0.06)",
                                    color: "rgba(255,255,255,0.3)",
                                },
                            }}
                        >
                            {isCreating ? "Создание..." : "Создать"}
                        </Button>
                    </Box>
                </Box>

                {/* Панель инструментов форматирования */}
                {mode === "edit" && (
                    <Box
                        sx={{
                            height: 48,
                            flexShrink: 0,
                            bgcolor: "#262626",
                            borderBottom: "1px solid #333",
                            display: "flex",
                            alignItems: "center",
                            px: 2,
                            gap: 0.5,
                        }}
                    >
                        <Tooltip title="Заголовок">
                            <IconButton
                                size="small"
                                onClick={handleHeading}
                                disabled={isCreating}
                                sx={{
                                    color: "rgba(255,255,255,0.7)",
                                    p: 1,
                                    "&:hover": {
                                        bgcolor: "rgba(255,255,255,0.08)",
                                        color: "#fff",
                                    },
                                }}
                            >
                                <TitleIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Жирный (⌘B)">
                            <IconButton
                                size="small"
                                onClick={handleBold}
                                disabled={isCreating}
                                sx={{
                                    color: "rgba(255,255,255,0.7)",
                                    p: 1,
                                    "&:hover": {
                                        bgcolor: "rgba(255,255,255,0.08)",
                                        color: "#fff",
                                    },
                                }}
                            >
                                <FormatBoldIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Курсив (⌘I)">
                            <IconButton
                                size="small"
                                onClick={handleItalic}
                                disabled={isCreating}
                                sx={{
                                    color: "rgba(255,255,255,0.7)",
                                    p: 1,
                                    "&:hover": {
                                        bgcolor: "rgba(255,255,255,0.08)",
                                        color: "#fff",
                                    },
                                }}
                            >
                                <FormatItalicIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                        </Tooltip>
                        
                        <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 1.5, borderColor: "rgba(255,255,255,0.1)" }} />
                        
                        <Tooltip title="Маркированный список">
                            <IconButton
                                size="small"
                                onClick={handleBulletList}
                                disabled={isCreating}
                                sx={{
                                    color: "rgba(255,255,255,0.7)",
                                    p: 1,
                                    "&:hover": {
                                        bgcolor: "rgba(255,255,255,0.08)",
                                        color: "#fff",
                                    },
                                }}
                            >
                                <FormatListBulletedIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Нумерованный список">
                            <IconButton
                                size="small"
                                onClick={handleNumberedList}
                                disabled={isCreating}
                                sx={{
                                    color: "rgba(255,255,255,0.7)",
                                    p: 1,
                                    "&:hover": {
                                        bgcolor: "rgba(255,255,255,0.08)",
                                        color: "#fff",
                                    },
                                }}
                            >
                                <FormatListNumberedIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Цитата">
                            <IconButton
                                size="small"
                                onClick={handleQuote}
                                disabled={isCreating}
                                sx={{
                                    color: "rgba(255,255,255,0.7)",
                                    p: 1,
                                    "&:hover": {
                                        bgcolor: "rgba(255,255,255,0.08)",
                                        color: "#fff",
                                    },
                                }}
                            >
                                <FormatQuoteIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                        </Tooltip>
                        
                        <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 1.5, borderColor: "rgba(255,255,255,0.1)" }} />
                        
                        <Tooltip title="Ссылка">
                            <IconButton
                                size="small"
                                onClick={handleLink}
                                disabled={isCreating}
                                sx={{
                                    color: "rgba(255,255,255,0.7)",
                                    p: 1,
                                    "&:hover": {
                                        bgcolor: "rgba(255,255,255,0.08)",
                                        color: "#fff",
                                    },
                                }}
                            >
                                <LinkIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Код">
                            <IconButton
                                size="small"
                                onClick={handleCode}
                                disabled={isCreating}
                                sx={{
                                    color: "rgba(255,255,255,0.7)",
                                    p: 1,
                                    "&:hover": {
                                        bgcolor: "rgba(255,255,255,0.08)",
                                        color: "#fff",
                                    },
                                }}
                            >
                                <CodeIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                        </Tooltip>
                    </Box>
                )}

                {/* Основная область контента */}
                <Box
                    sx={{
                        flex: 1,
                        minHeight: 0,
                        overflow: "hidden",
                        display: "flex",
                        justifyContent: "center",
                        bgcolor: "#1e1e1e",
                    }}
                >
                    <Box
                        sx={{
                            width: "100%",
                            maxWidth: "min(800px, 95vw)",
                            height: "100%",
                            display: "flex",
                            flexDirection: "column",
                            position: "relative",
                        }}
                    >
                        {/* Заголовок документа */}
                        <Box
                            sx={{
                                px: { xs: 6, md: 10 },
                                pt: 10,
                                pb: 3,
                                flexShrink: 0,
                            }}
                        >
                            <input
                                ref={titleRef}
                                type="text"
                                value={fileName}
                                onChange={(e) => setFileName(e.target.value)}
                                disabled={isCreating}
                                placeholder="Новый документ"
                                spellCheck={false}
                                style={{
                                    width: "100%",
                                    background: "transparent",
                                    border: "none",
                                    outline: "none",
                                    fontSize: "36px",
                                    fontWeight: 700,
                                    color: fileName.trim() ? "#dcddde" : "rgba(255,255,255,0.25)",
                                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                                    letterSpacing: "-0.02em",
                                    lineHeight: 1.2,
                                    padding: 0,
                                    caretColor: "#7c5cbf",
                                }}
                            />
                            <Divider
                                sx={{
                                    mt: 3,
                                    borderColor: "rgba(255,255,255,0.08)",
                                }}
                            />
                        </Box>

                        {/* Область редактирования или предпросмотра */}
                        {mode === "edit" ? (
                            <Box
                                sx={{
                                    flex: 1,
                                    minHeight: 0,
                                    overflow: "auto",
                                    px: { xs: 6, md: 10 },
                                    pb: 20,
                                    "&::-webkit-scrollbar": { width: 12 },
                                    "&::-webkit-scrollbar-track": { background: "transparent" },
                                    "&::-webkit-scrollbar-thumb": {
                                        background: "rgba(255,255,255,0.08)",
                                        borderRadius: 6,
                                        "&:hover": {
                                            background: "rgba(255,255,255,0.15)",
                                        },
                                    },
                                }}
                            >
                                <textarea
                                    ref={contentRef}
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    onKeyUp={handleContentKeyUp}
                                    onClick={handleContentClick}
                                    disabled={isCreating}
                                    placeholder="Начните писать..."
                                    spellCheck={false}
                                    style={{
                                        width: "100%",
                                        minHeight: "calc(100vh - 320px)",
                                        background: "transparent",
                                        border: "none",
                                        outline: "none",
                                        resize: "none",
                                        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                                        fontSize: "17px",
                                        lineHeight: 1.8,
                                        color: "#dcddde",
                                        caretColor: "#7c5cbf",
                                        padding: 0,
                                        letterSpacing: "0",
                                        whiteSpace: "pre-wrap",
                                        wordBreak: "break-word",
                                    }}
                                />
                            </Box>
                        ) : (
                            <Box
                                sx={{
                                    flex: 1,
                                    minHeight: 0,
                                    overflow: "auto",
                                    px: { xs: 6, md: 10 },
                                    pb: 20,
                                    "&::-webkit-scrollbar": { width: 12 },
                                    "&::-webkit-scrollbar-track": { background: "transparent" },
                                    "&::-webkit-scrollbar-thumb": {
                                        background: "rgba(255,255,255,0.08)",
                                        borderRadius: 6,
                                        "&:hover": {
                                            background: "rgba(255,255,255,0.15)",
                                        },
                                    },
                                }}
                            >
                                <MarkdownRenderer content={content} />
                            </Box>
                        )}
                    </Box>
                </Box>

                {/* Статусная строка */}
                <Box
                    sx={{
                        height: 28,
                        flexShrink: 0,
                        bgcolor: "#262626",
                        borderTop: "1px solid #333",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        px: 3,
                    }}
                >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
                        <Typography
                            sx={{
                                color: "rgba(255,255,255,0.5)",
                                fontSize: "12px",
                                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                                fontWeight: 500,
                            }}
                        >
                            {stats.words} {stats.words === 1 ? "слово" : stats.words < 5 ? "слова" : "слов"}
                        </Typography>
                        <Typography
                            sx={{
                                color: "rgba(255,255,255,0.35)",
                                fontSize: "12px",
                                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                            }}
                        >
                            {stats.chars.toLocaleString()} символов
                        </Typography>
                        <Typography
                            sx={{
                                color: "rgba(255,255,255,0.35)",
                                fontSize: "12px",
                                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                            }}
                        >
                            {stats.lines} {stats.lines === 1 ? "строка" : stats.lines < 5 ? "строки" : "строк"}
                        </Typography>
                        {!fileName.trim().endsWith(".md") && fileName.trim().length > 0 && (
                            <Typography
                                sx={{
                                    color: "#7c5cbf",
                                    fontSize: "12px",
                                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                                    opacity: 0.9,
                                    fontWeight: 500,
                                }}
                            >
                                → {fileName.trim()}.md
                            </Typography>
                        )}
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
                        {mode === "edit" && (
                            <Typography
                                sx={{
                                    color: "rgba(255,255,255,0.4)",
                                    fontSize: "12px",
                                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                                    fontWeight: 500,
                                }}
                            >
                                Стр {cursorLine}, Кол {cursorCol}
                            </Typography>
                        )}
                        <Typography
                            sx={{
                                color: "rgba(255,255,255,0.35)",
                                fontSize: "12px",
                                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                                fontWeight: 500,
                            }}
                        >
                            {mode === "edit" ? "Редактирование" : "Чтение"}
                        </Typography>
                    </Box>
                </Box>
            </Box>
        </Dialog>
    );
};