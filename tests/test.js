const path = require('path');
const fs = require('fs');
const CSVParser = require('../index');
const Parser = new CSVParser();

const testFileName = './tests/test-file.csv';

test('it should parse url', () => {
  const url = `""https:\/\/ad.doubleclick.net\/ddm\/ad\/N7676.791086DOUBLECLICKTECH.COM\/B9352239.127304136;sz=1x1;ord=[timestamp];dc_lat=;dc_rdid=;tag_for_child_directed_treatment=?"",""https:\/\/secure-gl.imrworldwide.com\/cgi-bin\/m?ci=nlsnci304&am=3&at=view&rt=banner&st=image&ca=nlsn32514&cr=crtve&pc=dcbm_plc0001&ce=dcbm&r=[timestamp]""`;
  expect(Parser.parseUrl(url)).toMatchSnapshot();
});

test('it should organize request urls', () => {
  const data = {
    impression_pixel_json: 'https://google.com/',
    tactic_id: '123456789',
  };
  expect(Parser.organizeRequestUrls(data)).toMatchSnapshot();
});

test('it should create a csv file with column names', done => {
  Parser.createFile(testFileName, 'column1,column2', () => {
    expect(fs.existsSync(path.resolve(testFileName))).toBe(true);
    done();
  });
});

test('it should read a file', done => {
  const tactic_id = '123456789';
  const content = `tactic_id,status,code,impression_pixel_json\n${tactic_id},FAILED,404,https://google.com\n`;
  Parser.createFile(testFileName, content, () => {
    Parser.readFile(testFileName, data => {
      expect(tactic_id).toEqual(data.tactic_id);
      done();
    });
  });
});

test('it should perform get requests', done => {
  Parser.request('https://google.com/').then(response => {
    expect(response).toMatchSnapshot();
    done();
  });
});
