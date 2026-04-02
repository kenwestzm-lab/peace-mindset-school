// Test the fix
const mime = "audio/webm;codecs=opus".split(";")[0].trim();
console.log("Fixed mime:", mime); // Should print: audio/webm
