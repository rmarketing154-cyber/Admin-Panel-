const fs = require('fs');
let content = fs.readFileSync('src/pages/Referrals.tsx', 'utf-8');

// The `selectedReferrer` return block was accidentally inserted inside the `useMemo` block when doing string replacement.
// Let's remove it from there and place it in the correct spot.

const badBlockStart = `  if (selectedReferrer) {
    const earnAmount = Number(selectedReferrer.referralEarnings) || 0;
    return (`;

const blockStartIdx = content.indexOf('  if (selectedReferrer) {\n    const earnAmount');
if (blockStartIdx !== -1) {
  const blockEndStr = '  return (Number(b.referralEarnings) || 0) - (Number(a.referralEarnings) || 0);\n      });';
  const blockEndIdx = content.indexOf('  return (Number(b.referralEarnings)', blockStartIdx);
  
  if (blockEndIdx !== -1) {
    const extractedBlock = content.substring(blockStartIdx, blockEndIdx);
    
    // Remove it from the current position
    content = content.substring(0, blockStartIdx) + '        ' + content.substring(blockEndIdx + '  return '.length);
    
    // Place it right before the main `return (` of the component
    const mainReturnStr = '  return (\n    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col flex-1">';
    const mainReturnIdx = content.lastIndexOf(mainReturnStr);
    
    if (mainReturnIdx !== -1) {
      // The extracted block has a stray `return (` at the end which was part of the map function sorting logic.
      // Wait, let's look at the extracted block carefully. 
      // The original script did: content.substring(0, returnIdx) + viewLogic + content.substring(returnIdx + 'return ('.length);
      // The issue is it matched the `return (` inside the `.sort` function instead of the main component return.
    }
  }
}

// Safer approach: rebuild the file to fix the structural issue since it's a known error.
