// 与 Go pkg/utils/json_parser.go SafeParseAIJSON 对齐：去除 markdown、提取 JSON、解析
function extractJsonCandidate(text) {
  let start = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{' || text[i] === '[') {
      start = i;
      break;
    }
  }
  if (start === -1) return '';
  const stack = [];
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (c === '\\') {
        escape = true;
        continue;
      }
      if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === '{' || c === '[') stack.push(c);
    else if (c === '}' || c === ']') {
      stack.pop();
      if (stack.length === 0) return text.slice(start, i + 1);
    }
  }
  return text.slice(start);
}

/**
 * 当 AI 输出因 max_tokens 截断导致 JSON 数组不完整时，
 * 尝试从中抢救出已完成的顶层数组元素，重新拼成合法 JSON 数组。
 * 仅处理顶层为数组（[...{...}...]）的情况。
 */
function repairTruncatedJsonArray(str) {
  const trimmed = str.trimStart();
  if (!trimmed.startsWith('[')) return null;

  let depth = 0;
  let inString = false;
  let escape = false;
  let lastCompletePos = -1;

  for (let i = 0; i < trimmed.length; i++) {
    const c = trimmed[i];
    if (inString) {
      if (escape) { escape = false; continue; }
      if (c === '\\') { escape = true; continue; }
      if (c === '"') inString = false;
      continue;
    }
    if (c === '"') { inString = true; continue; }
    if (c === '{' || c === '[') {
      depth++;
    } else if (c === '}' || c === ']') {
      depth--;
      // depth === 1 意味着刚刚关闭了一个顶层数组元素（对象）
      if (depth === 1) lastCompletePos = i + 1;
      // depth === 0 意味着整个数组已正常关闭
      if (depth === 0) return trimmed.slice(0, i + 1);
    }
  }

  if (lastCompletePos === -1) return null;
  return trimmed.slice(0, lastCompletePos) + ']';
}

function safeParseAIJSON(aiResponse, v) {
  if (!aiResponse || typeof aiResponse !== 'string') {
    throw new Error('AI返回内容为空');
  }
  let cleaned = aiResponse.trim()
    .replace(/^```json\s*/gm, '')
    .replace(/^```\s*/gm, '')
    .replace(/```\s*$/gm, '')
    .trim();
  const jsonStr = extractJsonCandidate(cleaned);
  if (!jsonStr) {
    throw new Error('响应中未找到有效的JSON对象或数组');
  }

  // 优先尝试完整解析
  try {
    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(v)) {
      v.length = 0;
      v.push(...(Array.isArray(parsed) ? parsed : []));
    } else if (v && typeof v === 'object') {
      Object.assign(v, parsed);
    }
    return parsed;
  } catch (err) {
    // JSON 解析失败时，尝试修复截断的数组（应对 max_tokens 截断场景）
    const repaired = repairTruncatedJsonArray(jsonStr);
    if (repaired && repaired !== jsonStr) {
      try {
        const parsed = JSON.parse(repaired);
        if (Array.isArray(v)) {
          v.length = 0;
          v.push(...(Array.isArray(parsed) ? parsed : []));
        } else if (v && typeof v === 'object') {
          Object.assign(v, parsed);
        }
        return parsed;
      } catch (_) {
        // 修复后仍然失败，抛出原始错误
      }
    }
    throw new Error('JSON解析失败: ' + err.message);
  }
}

module.exports = { safeParseAIJSON, extractJsonCandidate };
