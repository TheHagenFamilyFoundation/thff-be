module.exports = {

    triggerJob: function () {
        sails.log.info("=====Job Started=====");
        sails.log.debug(new Date());
        sails.log.info("=====Job Started=====\n\n");
    }

};