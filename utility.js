const utility = {
  blank: function(value){
    if(value === undefined){ return true; }
    if(value === null){ return true; }
    if(value instanceof Function){ return false; }
    if(value instanceof Date){ return false; }
    if(value instanceof Array && value.length === 0){ return true; }
    if(value instanceof Object && Object.keys(value).length === 0){ return true; }
    return false;
  },
  notBlank: function(value){
    return utility.blank(value) === false;
  },
};

module.exports = utility;
