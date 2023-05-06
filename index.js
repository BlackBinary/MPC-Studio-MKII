const fs = require("fs");
const midi = require("midi");
const sharp = require('sharp');

const inputImagePath = 'input.png';
const outputFolder = 'output';

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

function readImage(imagePath) {
  const image = fs.readFileSync(imagePath);
  const sysExBuffer = convertData(Buffer.from(image));
  return sysExBuffer;
}

async function splitImage(imagePath, outputFolder) {
  // Create the output folder if it doesn't exist
  if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder);
  }

  // Specify the split coordinates for each part
  const splitCoordinates = [
    [0, 0, 60, 60],
    [60, 0, 60, 60],
    [120, 0, 40, 60],
    [0, 60, 60, 20],
    [60, 60, 60, 20],
    [120, 60, 40, 20],
  ];

  // Iterate over each split coordinate
  splitCoordinates.forEach(async (splitCoordinate, i) => {
    const [left, top, width, height] = splitCoordinate;

    // Extract the split image
    const splitImage = sharp(imagePath).extract({ left, top, width, height });

    // Save the split image to the output folder
    await splitImage.toFile(`${outputFolder}/${i}.png`);
  });

  console.log('Split images created successfully!');
}


(async () => {
  splitImage(inputImagePath, outputFolder);

  const output = new midi.Output();
  output.openPort(0);

  const sysex = initSysex(output);

  sysex.sendPNG(readImage('output/0.png'), 0, 0);
  sysex.sendPNG(readImage('output/1.png'), 60, 0);
  sysex.sendPNG(readImage('output/2.png'), 120, 0);
  sysex.sendPNG(readImage('output/3.png'), 0, 60);
  sysex.sendPNG(readImage('output/4.png'), 60, 60);
  sysex.sendPNG(readImage('output/5.png'), 120, 60);

  output.closePort();
})();
