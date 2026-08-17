const fs = require('fs');
let content = fs.readFileSync('src/pages/Referrals.tsx', 'utf-8');

// We need to fix the syntax error.
// Let's find exactly what went wrong. The `if (selectedReferrer)` block got injected at the first `return (` it found, which was:
// `return (Number(b.referralEarnings) || 0) - (Number(a.referralEarnings) || 0);` inside `.sort()`

const fileLines = content.split('\n');

// 1. Locate the injected `if (selectedReferrer)` block
let startIdx = -1;
let endIdx = -1;
for (let i = 0; i < fileLines.length; i++) {
  if (fileLines[i].includes('if (selectedReferrer) {')) {
    startIdx = i;
  }
  // The block ends where it tries to return the rest of the sort function
  if (startIdx !== -1 && fileLines[i].includes('  return (Number(b.referralEarnings) || 0) - (Number(a.referralEarnings) || 0);')) {
    endIdx = i;
    break;
  }
}

if (startIdx !== -1 && endIdx !== -1) {
  // Extract the block, omitting the broken return at the end
  const injectedBlock = fileLines.slice(startIdx, endIdx).join('\n');
  
  // Replace the broken area with just the original sort return
  const fixedSort = '        return (Number(b.referralEarnings) || 0) - (Number(a.referralEarnings) || 0);';
  
  // Construct the new array of lines for the first half
  const newLines = [...fileLines.slice(0, startIdx), fixedSort, ...fileLines.slice(endIdx + 1)];
  
  // Now find the MAIN return of the component
  let mainReturnIdx = -1;
  for (let i = 0; i < newLines.length; i++) {
    if (newLines[i] === '  return (' && newLines[i+1].includes('<div className="bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col flex-1">')) {
      mainReturnIdx = i;
      break;
    }
  }
  
  if (mainReturnIdx !== -1) {
    // Insert the extracted block right before the main return
    newLines.splice(mainReturnIdx, 0, injectedBlock);
    
    fs.writeFileSync('src/pages/Referrals.tsx', newLines.join('\n'));
    console.log('Successfully fixed syntax structure.');
  } else {
    console.log('Could not find main return');
  }
} else {
  console.log('Could not find injected block');
}

