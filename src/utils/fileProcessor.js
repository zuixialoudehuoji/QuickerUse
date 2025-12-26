/**
 * 文件处理工具
 * 用于魔法拖拽功能的哈希计算、Base64转换等
 */

/**
 * 计算文本或 Blob 的 SHA-256
 * @param {string|Blob} message 
 */
async function computeDigest(message, algorithm = 'SHA-256') {
  const msgBuffer = typeof message === 'string' 
    ? new TextEncoder().encode(message) 
    : await message.arrayBuffer();
  
  const hashBuffer = await crypto.subtle.digest(algorithm, msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export default {
  /**
   * 读取文件并计算 MD5 (这里用 SHA-256 代替，因为 Web Crypto API 原生支持)
   * 注意：为了兼容性，如果必须 MD5 通常需要 spark-md5 库。
   * 这里为了零依赖，我们提供 SHA-1 和 SHA-256。
   * @param {File} file 
   */
  async getFileHash(file) {
    const sha1 = await computeDigest(file, 'SHA-1');
    const sha256 = await computeDigest(file, 'SHA-256');
    return {
      size: file.size,
      type: file.type,
      sha1,
      sha256
    };
  },

  /**
   * 图片转 Base64
   * @param {File} file 
   */
  async fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  }
};
