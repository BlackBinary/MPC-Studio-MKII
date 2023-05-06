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

function generateMessageMetadata(x, y) {
  const imageCoordinates = [x, 0x00, y, 0x00];

  return [
    ...[0x06, 0x3d],
    ...[0x20, 0x20],
    ...imageCoordinates,
    ...[0x4e, 0x02],
  ];
}

function initSysex(output) {
  function sendPNG(imageData, x, y) {
    const messageHeader = [0xf0, 0x47, 0x7f, 0x4a, 0x04];
    const messageMetadata = generateMessageMetadata(x, y);
  
    const messageData = Buffer.concat([
      Buffer.from(messageHeader),
      Buffer.from(messageMetadata),
      imageData,
      Buffer.from([0xf7]),
    ]);
  
    output.sendMessage([...messageData]);
  }

  return {
    sendPNG,
  };
}

(() => {
  const image = fs.readFileSync("x.png");
  const sysExBuffer = convertData(Buffer.from(image));
  const output = new midi.Output();
  output.openPort(0);

  const sysex = initSysex(output);

  // Send the image for 0, 0 and 0, 60 and 0, 120
  // Send the image for 60, 0 and 60, 60 and 60, 120
  sysex.sendPNG(sysExBuffer, 0, 0);
  sysex.sendPNG(sysExBuffer, 60, 0);
  sysex.sendPNG(sysExBuffer, 120, 0);
  sysex.sendPNG(sysExBuffer, 0, 60);
  sysex.sendPNG(sysExBuffer, 60, 60);
  sysex.sendPNG(sysExBuffer, 120, 60);

  output.closePort();
})();
