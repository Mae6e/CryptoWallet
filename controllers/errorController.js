
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    success: err.success,
    status: err.status,
    statusCode: err.statusCode,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  //? Operational ,Trusted Error : send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: err.success,
      statusCode: err.statusCode,
      status: err.status,
      message: err.message,
    });
  }
  //? Programming ,Unknown Error : Dont leak error  details
  else {
    //? 1.Log error
    console.log('Error', err);

    //? 2.Send generic message
    res.status(500).json({
      success: false,
      statusCode: 500,
      status: 'error',
      message: 'Something went very wrong!',
    });
  }
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  }
  else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    error.name = err.name;
    error.message = err.message;
    error.status = err.status;
    error.statusCode = err.statusCode;
    error.success = err.success;
    sendErrorProd(error, res);
  }
};
