const utility = require('./utility');
const Memoizer = require('./Memoizer');
const moment = require('moment');
class ErrorLoggerBase {
  static create(props = {}){
    if(props instanceof Error){
      throw new Error(`ErrorLogger should be instatiated with: #create({ error }) instead of #create(error)`);
    }
    return new this(props);
  }

  constructor(props = {}){
    this.props = props;
  }

  error(){
    return this.props.error;
  }

  isError(){
    return this.error() instanceof Error;
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

  namespace(){
    throw new Error('Not Implemented Error');
  }

  requestJson(){
    return {
      path: '',
      host: '',
      params: '',
      headers: '',
    };
  }

  s3Record(){
    return {
      namespace: this.namespace(),
      request: this.requestJson(),
      error: this.errorJson(),
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
    throw new Error('NotImplementedError');
    // return {String}
    // e.g: path/to/log/of/this/error.json;
  }

  s3Bucket(){
    throw new Error('NotImplementedError');
    // return {String}
    // e.g: error-log.mydomain.com;
  }

  s3(){
    // just override it;
    const AWS = require('aws-sdk');
    const S3 = new AWS.S3({ region: 'ap-southeast-1' });
    return S3;
  }

  doSaveS3(){
    return new Promise((resolve, reject) => {
      const S3 = this.s3();
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

  logOnEnv(env){
    return env === 'development';
  }

  doConsoleLog(){
    if(this.logOnEnv(process.env.NODE_ENV)){
      console.error(`logging error on ${process.env.NODE_ENV}`);
      console.error(this.error());
      console.error(this.error().stack);
    }
  }

  doLogError(){
    this.doConsoleLog();
    return this.doSaveS3();
  }

}

Memoizer.extend(ErrorLoggerBase);
module.exports = ErrorLoggerBase;
