async function run() {
    const totalAmountVal = Number(
          30 ?? 
          undefined ?? 
          undefined ?? 
          (Number(30) * Number(1))
        );
    console.log("totalAmountVal:", totalAmountVal);
}
run();
