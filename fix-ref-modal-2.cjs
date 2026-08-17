const fs = require('fs');
let content = fs.readFileSync('src/pages/Referrals.tsx', 'utf-8');

// Now we need to remove the rest of the old dropdown code and add the new "details view" rendering block at the top

const oldDropdownEndRegex = /\{\/\* Removed nested dropdown block \*\/\}[\s\S]*?\{\/\* Referred Users Dropdown \(Nested List\) \*\/\}.*?\{\/\* Premium Header matching the demo \*\/\}.*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*\);/s;

// Wait, the regex might be tricky, let's just find the index of "Removed nested dropdown block" and replace everything up to the final closing divs of the Referrals component.
// The structure is:
// {filteredReferrers.map(..., return ( <div> <div> row </div> {/* Removed nested dropdown block */} <dropdown contents> </div> ))} </div> )} </div> </div> </div>

const removedMarker = '{/* Removed nested dropdown block */}';
const removedIdx = content.indexOf(removedMarker);

if(removedIdx !== -1) {
  // Find the end of the map function:
  const mapEndStr = '              })}\n            </div>\n          )}\n        </div>\n      </div>\n    </div>\n  );\n}';
  const mapEndFallback = '              })}\n            </div>\n          )}\n        </div>\n      </div>\n    </div>\n  );';
  
  let mapEndIdx = content.indexOf('              })}\n            </div>\n          )}\n        </div>');
  if(mapEndIdx !== -1) {
      // Cut out all the old dropdown code between the marker and the end of the map loop
      const replacementTail = `
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}`;
      
      content = content.substring(0, removedIdx) + replacementTail;
      fs.writeFileSync('src/pages/Referrals.tsx', content);
      console.log('Cleaned up old dropdown code');
  } else {
      console.log('Could not find end of map loop');
  }
} else {
  console.log('Could not find removed marker');
}
