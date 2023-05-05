const fs = require("fs");
const midi = require("midi");

function convertData(originalBuffer) {
  const convertedBuffer = [];

  for (let i = 0; i < originalBuffer.length; i += 7) {
    const group = originalBuffer.slice(i, i + 7);
    let controlByte = 0;

    for (let j = 0; j < group.length; j++) {
      if (group[j] >= 128) {
        controlByte |= 1 << j;
        group[j] -= 128;
      }
    }

    convertedBuffer.push(controlByte, ...group);
  }

  return Buffer.from(convertedBuffer);
}

function sendSysExMessage(portNumber, data) {
  const output = new midi.Output();
  output.openPort(portNumber);

  const messageHeader = [0xf0, 0x47, 0x7f, 0x4a, 0x04];
  const messageMetadata = [
    0x06, 0x3d, 0x20, 0x20, 0x00, 0x00, 0x00, 0x00, 0x4e, 0x02,
  ];
  const messageData = Buffer.concat([
    Buffer.from(messageHeader),
    Buffer.from(messageMetadata),
    data,
    Buffer.from([0xf7]),
  ]);

  output.sendMessage([...messageData]);

  output.closePort();
}

(() => {
  const image = fs.readFileSync("input.png");
  const sysExBuffer = convertData(Buffer.from(image));

  sendSysExMessage(0, sysExBuffer);
})();
