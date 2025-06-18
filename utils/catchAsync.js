// exports.catchAsync = (fn) => {
//   return (req, res, next) => {
//     fn(req, res, next).catch((err) => next(err));
//   };
// };
exports.catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch((err) => {
      if (err.name === 'ValidationError') {
        return res.status(400).json({
          status: "failed",
          msg: err.toString(),
        });
      } else if (err.name === 'MongoError' && err.code === 11000) {
        return res.status(400).json({
          status: "failed",
          msg: 'Duplicate field value error: ' + err.toString(),
        });
      } else if (err.name === 'CastError') {
        return res.status(400).json({
          status: "failed",
          msg: 'Invalid resource ID: ' + err.toString(),
        });
      } else  {
        res.status(404).json({
          status: "failed",
          msg: err.toString(),
        });
        next(err);
      }
    });
  };
};
