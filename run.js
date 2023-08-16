import * as schedule from "node-schedule";

import { spawn } from "child_process";

schedule.scheduleJob(
  {
    hour: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22],
    minute: 0,
  },
  function () {
    const command = "npm"; // Example command; you can replace this with any command you want to run
    const args = ["run", "pw"];

    const childProcess = spawn(command, args, {shell:true});

    childProcess.stdout.on("data", (data) => {
      console.log(`stdout: ${data}`);
    });

    childProcess.stderr.on("data", (data) => {
      console.error(`stderr: ${data}`);
    });

    childProcess.on("close", (code) => {
      console.log(`child process exited with code ${code}`);
    });
  }
);

