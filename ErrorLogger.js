const NR = require('newrelic');
const utility = require('../utils/utility');
const Memoizer = require('./Memoizer');
const moment = require('moment');
class ErrorLoggerBase {
  constructor(props = {}){
    this.props = props;
  }

  request(){
    return this.props.request;
  }

  error(){
    return this.props.error;
  }

  isError(){
    return this.error() instanceof Error;
  }

  headers(){
    return this.request().headers;
  }

  ip(){
    const { headers } = this.request();
    return headers['cf-connecting-ip'];
  }

  params(){
    return this.request().declaredParams;
  }

  improperRejection(){
    return !(this.isError());
  }

  errorJson(){
    if(this.isError()){
      const error = this.error();
      return {
        stack: error.stack.split('\n'),
        message: error.message,
        name: error.name,
      }
    } else {
      return {
        message: 'NOT_IMPLEMENTED',
        name: 'IMPROPER_REJECTION',
        info: JSON.stringify(this.error())
      };
    }
  }

  requestPath(){
    return this.request().path;
  }


  requestJson(){
    const request = this.request();
    return {
      path: this.requestPath(),
      ip: this.ip(),
      host: this.headers().host,
      origin: this.headers().origin,
      referer: this.headers().referer,
      authorization: this.headers().authorization,
      params: JSON.stringify(this.params()),
      headers: JSON.stringify(this.headers())
    };
  }

  s3Record(){
    return {
      error: this.errorJson(),
      request: this.requestJson(),
      recordTime: this.recordTime(),
      recordTimeTs: this.recordTime().getTime(),
    }
  }

  recordTime(){
    return this.memoize('recordTime', () => {
      return new Date();
    });
  }

  identifier(){
    return this.memoize('identifier', () => {
      const namespace = this.isError() ? this.error().name : 'error';
      return `${namespace}:${this.recordTime().getTime()}:${parseInt(Math.random() * 1000)}`
    });
  }

  s3Location(){
    const date = moment(this.recordTime()).format('YYYY-MM-DD');
    return `error-logs/externals/${date}/${this.identifier()}.json`;
  }

  s3Bucket(){
    return `log.cryptoket.io`;
  }

  doSaveS3(){
    return new Promise((resolve, reject) => {
      const Body = JSON.stringify(this.s3Record());
      const Bucket = this.s3Bucket();
      const Key = this.s3Location();
      const ContentType = 'application/json';
      S3.putObject({ Bucket, Key, Body, ContentType }, (error, data) => {
        if(error){ reject(error); }
        else{ resolve(data); }
      });
    });
  }

  bqTable(){
    return BQ.dataset('CryptoketSystemLogs').table('Errors');
  }

  async doSaveBQ(){
    const table = this.bqTable();
    return table.insert(this.bqRecord());
  }

  async doSaveAPM(){
    if(utility.blank(this.apmClient())){ return; }
    return this.apmClient().captureError(this.error());
  }

  async doSaveNR(){
    if(this.isError()){
      return NR.noticeError(this.error(), this.params());
    } else {
      console.error('cannot send to new relic')
      console.error(this.error());
    }
  }

  doConsoleLog(){
    if(utility.developmentMode()){
      console.error(this.error())
      console.error(this.error().stack);
    }
  }

  async doLogError(){
    this.doConsoleLog();
    const promise1 = this.doSaveS3();
    const promise2 = this.doSaveNR();
    return Promise.all([promise1, promise3]);
  }

  bqRecord(){
    const defaultRecord = {
      bucket: this.s3Bucket(),
      location: this.s3Location(),
      request: {
        path: this.requestPath(),
        ip: this.ip(),
      },
      recordTime: this.recordTime(),
    };
    const errorRecord = (() => {
      if(this.isError()){
        const error = this.error();
        return {
          name: error.name,
          message: error.message,
        };
      } else {
        return {
          name: 'IMPROPER REJECTION',
          message: 'NOT_IMPLEMENTED'
        }
      }
    })();
    return Object.assign({}, defaultRecord, { error: errorRecord });
  }

}

Memoizer.extend(ErrorLogger);
module.exports = ErrorLogger;
