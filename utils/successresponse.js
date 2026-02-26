const successResponse = (res, data, message, status) => {
  res.status(status).json({
    success: true,
    status,
    message,
    data,
  });
};

module.exports =  successResponse ;
