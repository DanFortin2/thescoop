// database is let instead of const to allow us to modify it in test.js
let database = {
  users: {},
  articles: {},
  nextArticleId: 1,
  comments: {},
  nextCommentId: 1
};

const routes = {
  '/users': {
    'POST': getOrCreateUser
  },
  '/users/:username': {
    'GET': getUser
  },
  '/articles': {
    'GET': getArticles,
    'POST': createArticle
  },
  '/articles/:id': {
    'GET': getArticle,
    'PUT': updateArticle,
    'DELETE': deleteArticle
  },
  '/articles/:id/upvote': {
    'PUT': upvoteArticle
  },
  '/articles/:id/downvote': {
    'PUT': downvoteArticle
  },
  //comments keys
  '/comments': {
    'POST': createComment
  },
  '/comments/:id': {
    'PUT': updateComment,
    'DELETE': deleteComment
  },
  '/comments/:id/upvote': {
    'PUT': upvoteComment
  },
  '/comments/:id/downvote': {
    'PUT': downvoteComment
  }
};


function getUser(url, request) {
  //URL is entered and splits the string at the forward slashes. Forward slashes are removed.
  //Ex. google.ca/Dan/Pass/ would return
  //google.ca
  //Dan
  //Pass
  //as seperate pathSegments in the map function. Then returns them to the
  //variable in an array. Array 1 would be the username in an http request 0 is the hostname

  const username = url.split('/').filter(segment => segment)[1];

  //user is the value of username in the users object under database.
  //the username is created in the function below "getOrCreateUsers" and grabbed as a
  //value from the URL input
  const user = database.users[username];
  const response = {};

  //user comes from the below function in the response
  if (user) {
    //Articles || Ids created in the articles functions these are coming From
    //the create and get articles Functions
    const userArticles = user.articleIds.map(
        articleId => database.articles[articleId]);
        //have to write these functions out
    const userComments = user.commentIds.map(
        commentId => database.comments[commentId]);
        //use the info above to create it's own response to pass to the other
        //Functions
    response.body = {
      user: user,
      userArticles: userArticles,
      userComments: userComments
    };
    response.status = 200;
  } else if (username) {
    response.status = 404;
  } else {
    response.status = 400;
  }

  return response;
}

function getOrCreateUser(url, request) {
  const username = request.body && request.body.username;
  const response = {};

  if (database.users[username]) {
    response.body = {user: database.users[username]};
    response.status = 200;
  } else if (username) {
    const user = {
      username: username,
      articleIds: [],
      commentIds: []
    };
    database.users[username] = user;

    response.body = {user: user};
    response.status = 201;
  } else {
    response.status = 400;
  }

  return response;
}


function getArticles(url, request) {
  const response = {};

  response.status = 200;
  response.body = {
    articles: Object.keys(database.articles)
        .map(articleId => database.articles[articleId])
        .filter(article => article)
        .sort((article1, article2) => article2.id - article1.id)
  };

  return response;
}

function getArticle(url, request) {
  const id = Number(url.split('/').filter(segment => segment)[1]);
  const article = database.articles[id];
  const response = {};

  if (article) {
    article.comments = article.commentIds.map(
      commentId => database.comments[commentId]);

    response.body = {article: article};
    response.status = 200;
  } else if (id) {
    response.status = 404;
  } else {
    response.status = 400;
  }

  return response;
}

function createArticle(url, request) {
  const requestArticle = request.body && request.body.article;
  const response = {};

  if (requestArticle && requestArticle.title && requestArticle.url &&
      requestArticle.username && database.users[requestArticle.username]) {
    const article = {
      id: database.nextArticleId++,
      title: requestArticle.title,
      url: requestArticle.url,
      username: requestArticle.username,
      commentIds: [],
      upvotedBy: [],
      downvotedBy: []
    };

    database.articles[article.id] = article;
    database.users[article.username].articleIds.push(article.id);

    response.body = {article: article};
    response.status = 201;
  } else {
    response.status = 400;
  }

  return response;
}

function updateArticle(url, request) {
  const id = Number(url.split('/').filter(segment => segment)[1]);
  const savedArticle = database.articles[id];
  const requestArticle = request.body && request.body.article;
  const response = {};

  if (!id || !requestArticle) {
    response.status = 400;
  } else if (!savedArticle) {
    response.status = 404;
  } else {
    savedArticle.title = requestArticle.title || savedArticle.title;
    savedArticle.url = requestArticle.url || savedArticle.url;

    response.body = {article: savedArticle};
    response.status = 200;
  }

  return response;
}

function deleteArticle(url, request) {
  const id = Number(url.split('/').filter(segment => segment)[1]);
  const savedArticle = database.articles[id];
  const response = {};

  if (savedArticle) {
    database.articles[id] = null;
    savedArticle.commentIds.forEach(commentId => {
      const comment = database.comments[commentId];
      database.comments[commentId] = null;
      const userCommentIds = database.users[comment.username].commentIds;
      userCommentIds.splice(userCommentIds.indexOf(id), 1);
    });
    const userArticleIds = database.users[savedArticle.username].articleIds;
    userArticleIds.splice(userArticleIds.indexOf(id), 1);
    response.status = 204;
  } else {
    response.status = 400;
  }

  return response;
}

function upvoteArticle(url, request) {
  const id = Number(url.split('/').filter(segment => segment)[1]);
  const username = request.body && request.body.username;
  let savedArticle = database.articles[id];
  const response = {};

  if (savedArticle && database.users[username]) {
    savedArticle = upvote(savedArticle, username);

    response.body = {article: savedArticle};
    response.status = 200;
  } else {
    response.status = 400;
  }

  return response;
}

function downvoteArticle(url, request) {
  const id = Number(url.split('/').filter(segment => segment)[1]);
  const username = request.body && request.body.username;
  let savedArticle = database.articles[id];
  const response = {};

  if (savedArticle && database.users[username]) {
    savedArticle = downvote(savedArticle, username);

    response.body = {article: savedArticle};
    response.status = 200;
  } else {
    response.status = 400;
  }

  return response;
}

function upvote(item, username) {
  if (item.downvotedBy.includes(username)) {
    item.downvotedBy.splice(item.downvotedBy.indexOf(username), 1);
  }
  if (!item.upvotedBy.includes(username)) {
    item.upvotedBy.push(username);
  }
  return item;
}

function downvote(item, username) {
  if (item.upvotedBy.includes(username)) {
    item.upvotedBy.splice(item.upvotedBy.indexOf(username), 1);
  }
  if (!item.downvotedBy.includes(username)) {
    item.downvotedBy.push(username);
  }
  return item;
}


//function to create comments
function createComment(url, request) {
  //request coming in like this  { body:{ comment: { body: 'Comment Body', username: 'existing_user', articleId: 1 }}}
  const pendingComment = request.body && request.body.comment;
  const response = {};

  //if pendingComment is truthy has a body, the username exists and the article ID exists
  if(pendingComment && pendingComment.body && database.users[pendingComment.username]
    && database.articles[pendingComment.articleId]) {
    //create variable name called it comment
    const comment = {
      //id is incremented of database ID
      id: database.nextCommentId++,
      //the return responses need a body, body key is set to the comment body
      body: pendingComment.body,
      //username is set to comment username
      username: pendingComment.username,
      //empty arrays to handle votes and downvotes from another function
      upvotedBy: [],
      downvotedBy: [],
      //article ID is set to the passed in article ID
      articleId: pendingComment.articleId
    };
    //push the comment object into the comments global object. the comment ID starts as the first key and then the
    //comment is an object within that key ex.
    /*{ '1':{ id: 1,body: 'Comment Body',username: 'existing_user',upvotedBy: [],downvotedBy: [],articleId: 1 } }*/
    database.comments[comment.id] = comment;
    //push the comment ID into the commentID's for the username passed in the comments object ex. [1]
    database.users[comment.username].commentIds.push(comment.id);
    //push the same comment ID as above into the commentID's for the article based off the article ID
    //passed in the comments object ex. [1]
    database.articles[comment.articleId].commentIds.push(comment.id);
    //push the response.body as the comment object
    response.body = {comment: comment};
    //also push the response status in the response object for created
    response.status = 201;
  }  else {
    //if does not meet requrements above only push this status into the response object for bad request
    response.status = 400;
  }
  //return the response crafted above
  return response;
}




function updateComment(url, request) {
  //grab the number at the end of the url and store as the comment id ex. /comments/1 we take the 1
  const id = Number(url.split('/').filter(segment => segment)[1]);
  //we then create a variable and store the global comment by its ID
  const savedComment = database.comments[id];
  //create a new variable with the pending comment from the request parameter passed in ex.
  //{ body:{ comment:{ id: 1,body: 'Updated Body',username: 'existing_user',articleId: 1 } } }
  const pendingComment = request.body && request.body.comment;
  //empty object for the response to pass back
  const response = {};
  //if there is no ID or no pending comment then return 400 bad request
  if (!id || !pendingComment) {
    response.status = 400;
    //else if there is an ID and pending comment but not saved comment by that ID
    //then return 404 file not found
  } else if (!savedComment) {
    response.status = 404;
    //if has valid ID, pending comment and ID matches a saved comment in the global comment variable
  } else {
    //then the saved comment body will be the new pending comment body, or if not edited take on the saved
    //comment body
    savedComment.body = pendingComment.body || savedComment.body;
    //return the response body to match the new comment body object with the saved comment variable
    //which could be the pending or original comment
    response.body = {comment: savedComment};
    //return a status of 200 to show the server processed. (OK)
    response.status = 200;
  }
  return response;
}


function deleteComment(url, request) {
  //grab the number at the end of the url and store as the comment id ex. /comments/1 we take the 1
  const id = Number(url.split('/').filter(segment => segment)[1]);
  //we then create a variable and store the global comment by its ID
  const savedComment = database.comments[id];
  //empty object for the response to pass back
  const response = {};

  //if savedComment is truthy
  if (savedComment) {
    //delete the comment uot of the global database comments object by the ID
    database.comments[id] = null;

    //created variable to store the comment ID's then splice the comment ID out of the array. Used Index of to specify the exact index
    //item and then only remove 1 array item
    const userComments = database.users[savedComment.username].commentIds;
    userComments.splice(userComments.indexOf(id), 1);

    const articleComments = database.articles[savedComment.articleId].commentIds;
    articleComments.splice(articleComments.indexOf(id), 1);
    //return response code no content to show successful deletion
    response.status = 204;
    //if saved comment is falsey then return 404 not found
  } else {
    response.status = 404;
  }
  return response;
}




function upvoteComment(url, request) {

}

function downvoteComment(url, request) {

}



// Write all code above this line.

const http = require('http');
const url = require('url');

const port = process.env.PORT || 4000;
const isTestMode = process.env.IS_TEST_MODE;

const requestHandler = (request, response) => {
  const url = request.url;
  const method = request.method;
  const route = getRequestRoute(url);

  if (method === 'OPTIONS') {
    var headers = {};
    headers["Access-Control-Allow-Origin"] = "*";
    headers["Access-Control-Allow-Methods"] = "POST, GET, PUT, DELETE, OPTIONS";
    headers["Access-Control-Allow-Credentials"] = false;
    headers["Access-Control-Max-Age"] = '86400'; // 24 hours
    headers["Access-Control-Allow-Headers"] = "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept";
    response.writeHead(200, headers);
    return response.end();
  }

  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.setHeader(
      'Access-Control-Allow-Headers', 'X-Requested-With,content-type');

  if (!routes[route] || !routes[route][method]) {
    response.statusCode = 400;
    return response.end();
  }

  if (method === 'GET' || method === 'DELETE') {
    const methodResponse = routes[route][method].call(null, url);
    !isTestMode && (typeof saveDatabase === 'function') && saveDatabase();

    response.statusCode = methodResponse.status;
    response.end(JSON.stringify(methodResponse.body) || '');
  } else {
    let body = [];
    request.on('data', (chunk) => {
      body.push(chunk);
    }).on('end', () => {
      body = JSON.parse(Buffer.concat(body).toString());
      const jsonRequest = {body: body};
      const methodResponse = routes[route][method].call(null, url, jsonRequest);
      !isTestMode && (typeof saveDatabase === 'function') && saveDatabase();

      response.statusCode = methodResponse.status;
      response.end(JSON.stringify(methodResponse.body) || '');
    });
  }
};

const getRequestRoute = (url) => {
  const pathSegments = url.split('/').filter(segment => segment);

  if (pathSegments.length === 1) {
    return `/${pathSegments[0]}`;
  } else if (pathSegments[2] === 'upvote' || pathSegments[2] === 'downvote') {
    return `/${pathSegments[0]}/:id/${pathSegments[2]}`;
  } else if (pathSegments[0] === 'users') {
    return `/${pathSegments[0]}/:username`;
  } else {
    return `/${pathSegments[0]}/:id`;
  }
}

if (typeof loadDatabase === 'function' && !isTestMode) {
  const savedDatabase = loadDatabase();
  if (savedDatabase) {
    for (key in database) {
      database[key] = savedDatabase[key] || database[key];
    }
  }
}

const server = http.createServer(requestHandler);

server.listen(port, (err) => {
  if (err) {
    return console.log('Server did not start succesfully: ', err);
  }

  console.log(`Server is listening on ${port}`);
});
