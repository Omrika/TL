const path = require('path');
const FS = require('fs');
const CSV = require('fast-csv');
const XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;

const CSV_FILE_PATH = path.resolve('./data/data.csv');
const REQUEST_URLS = path.resolve('./data/organized-request-urls.csv');
const ALL_REQUESTS = path.resolve('./data/all-requests.csv');
const FAILED_REQUEST = path.resolve('./data/failed-request.csv');

class CSVParser {
  /**
   * Read a local file
   * 
   * @param {String} url
   * @param {Function} onReceiveData
   * @param {Function} onComplete
   * @return {Null}
   */
  readFile(url, onReceiveData = Function.prototype, onComplete = Function.prototype) {
    if (!url) return;
    const stream = FS.createReadStream(url);
    CSV.fromStream(stream, { headers: true })
      .on('data', onReceiveData)
      .on('end', onComplete);
  }

  /**
   * Create a file
   * @param {String} fileName
   * @param {String} content
   * @param {Function} onComplete
   */
  createFile(fileName, content = '', onComplete = Function.prototype) {
    FS.writeFile(fileName, content, onComplete);
  }

  /**
   * Parse an escaped URL
   * @param {String} url
   * @return {Object} response
   */
  parseUrl(url) {
    const response = {};
    try {
      response.urls = JSON.parse(url);
    } catch (error) {
      response.message = 'Cannot parse URL.';
      response.error = true;
    }
    return response;
  }

  /**
   * Performs a GET reqest
   * @param {String} url
   * @return {Null}
   */
  request(url) {
    return new Promise((resolve, reject) => {
      var xhttp = new XMLHttpRequest();
      xhttp.addEventListener('load', () => resolve(xhttp));
      xhttp.open('GET', url, true);
      xhttp.send();
    });
  }

  /**
   * Append content to a local file
   * @param {String} fileName
   * @param {String} content
   * @param {Function} onComplete | using `Function.prototype` as default
   * @return {Null}
   */
  output(fileName, content, onComplete = Function.prototype) {
    if (!fileName || !content) return;
    FS.appendFile(fileName, content, onComplete);
  }

  /**
   * Organize request URLs
   * @param {Object} data
   * @return {Object} response
   */
  organizeRequestUrls(data) {
    const response = this.parseUrl(data.impression_pixel_json);
    if (response.error) {
      /**
       * Assuming the status will be
       * 404 since the URL is invalid.
       * 
       * NICE2HAVE: Use regex to determine if
       * there's a valid URL in the string
       * being parsed.
       */
      const content = `${data.tactic_id},FAILED,404,INVALID_URL: ${data.impression_pixel_json}\n`;
      this.output(FAILED_REQUEST, content);
    } else {
      response.urls.forEach(url => (
        this.output(
          REQUEST_URLS,
          `${data.tactic_id},${url.split(',').join('\n')}\n`,
        )
      ));
    }
    return response;
  }

  /**
   * Get request status
   * @return {Null}
   */
  getRequestStatus() {
    this.readFile(REQUEST_URLS, data => {
      try {
        this.request(data.impression_pixel_json).then(response => {
          const FAILED = response.status >= 400 && response.status <= 599;
          const PASS = response.status >= 200 && response.status <= 399;
          if (FAILED) {
            const content = `${data.tactic_id},FAILED,${response.status},${data.impression_pixel_json}\n`;
            this.output(FAILED_REQUEST, content);
            this.output(ALL_REQUESTS, content);
            console.info(content);
          }
          if (PASS) {
            const content = `${data.tactic_id},PASS,${response.status},${data.impression_pixel_json}\n`;
            this.output(ALL_REQUESTS, content);
            console.info(content);
          }
        });
      } catch (error) {
        /**
         * Invalid URLS
         */
        const content = `${data.tactic_id},FAILED,404,${data.impression_pixel_json}\n`;
        this.output(ALL_REQUESTS, content);
        this.output(FAILED_REQUEST, content);
        console.info(content);
      }
    });
  }

  render() {
    /**
     * Create CSV files with appropriate column names
     */
    this.createFile(REQUEST_URLS, `tactic_id,impression_pixel_json\n`);
    this.createFile(ALL_REQUESTS, `tactic_id,status,code,impression_pixel_json\n`);
    this.createFile(FAILED_REQUEST, `tactic_id,status,code,impression_pixel_json\n`);
    this.readFile(
      CSV_FILE_PATH,
      this.organizeRequestUrls.bind(this),
      this.getRequestStatus.bind(this),
    );
  }
}

module.exports = CSVParser;
