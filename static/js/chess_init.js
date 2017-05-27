var board,
  game = new Chess(),
  statusEl = $('#status'),
  fenEl = $('#fen'),
  pgnEl = $('#pgn');

// do not pick up pieces if the game is over
// only pick up pieces for the side to move
var onDragStart = function(source, piece, position, orientation) {
  if (game.game_over() === true ||
      (game.turn() === 'w' && piece.search(/^b/) !== -1) ||
      (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
    return false;
  }
};

var onDrop = function(source, target) {
  // see if the move is legal
  var move = game.move({
    from: source,
    to: target,
    promotion: 'q' // NOTE: always promote to a queen for example simplicity
  });

  // illegal move
  if (move === null) return 'snapback';

  sendMove(source, target);
  updateStatus();
};

// update the board position after the piece snap 
// for castling, en passant, pawn promotion
var onSnapEnd = function() {
  board.position(game.fen());
};

var sendMove = function(source, target) {
    var moves = {"new": {"source" : source, "target" : target}};

    $.ajax({
      type: "POST",
      url: "/moves",
      data: $.param(moves),
      dataType: 'json',
      success: function(response) {
          console.log(response);
          updateMoveList(response);
          showCandidateMoves(response["candidates"]);
      },
      error: function(error) {
          console.log(error);
      }
    });
};

var updateMoveList = function(response) {
    var turn = Math.floor(game.history().length/2 - 0.5)+1;
    if (game.turn() === 'b') {
        var td = "<td id='white_"+turn+"'>"+turn+". "+response["move"]+"</td>";
        var result = "<tr id='turn_"+turn+"'>";
        result = result+td;
        result = result + "</tr>";
        $("#pgn-table").append(result);
    }
    else{
        var td = "<td id='black_"+turn+"'>"+response["move"]+"</td>";
        $("#turn_"+turn).append(td);
    }
}

var removeLastMove = function() {
    var turn = Math.floor(game.history().length/2) + 1;
    if (game.turn() === 'b') {
        $('#black_'+turn).remove();
    }
    else {
        $('#turn_'+turn).remove();
    }
};

var showCandidateMoves = function(candidates) {
    $("#candidates table tbody tr").remove();
    for(var i=0; i<candidates.length; i++){
        var value = candidates[i];
        var tr = "<tr><td id='candidate_"+i+"'>"+value+"</td></tr>";
        $("#candidates table tbody").append(tr);
        $("#candidate_"+i).on("click", candidate_onclick);
    }
};

var updateStatus = function() {
  var status = '';

  var moveColor = 'White';
  if (game.turn() === 'b') {
    moveColor = 'Black';
  }

  // checkmate?
  if (game.in_checkmate() === true) {
    status = 'Game over, ' + moveColor + ' is in checkmate.';
  }

  // draw?
  else if (game.in_draw() === true) {
    status = 'Game over, drawn position';
  }

  // game still on
  else {
    status = moveColor + ' to move';

    // check?
    if (game.in_check() === true) {
      status += ', ' + moveColor + ' is in check';
    }
  }

  statusEl.html(status);
  fenEl.html(game.fen());
  pgnEl.html(game.pgn());
};

var cfg = {
  draggable: true,
  position: 'start',
  onDragStart: onDragStart,
  onDrop: onDrop,
  onSnapEnd: onSnapEnd
};
board = ChessBoard('board', cfg);

updateStatus();

// Board Navigation

var forward = function(e) {
    var moves = {"next": game.fen()};
    $.ajax({
      type: "POST",
      url: "/moves",
      data: $.param(moves),
      dataType: 'json',
      success: function(response) {
          console.log(response);
          game.move(response["move"]);
          board.position(game.fen(), true);
          updateMoveList(response);
          showCandidateMoves(response["candidates"]);
      },
      error: function(error) {
          console.log(error);
      }
    });
}

var backward = function(e) {
    game.undo();
    board.position(game.fen(), true);
    removeLastMove();

    var moves = {"previous": game.fen()};
    $.ajax({
      type: "POST",
      url: "/moves",
      data: $.param(moves),
      dataType: 'json',
      success: function(response) {
          console.log(response);
          showCandidateMoves(response["candidates"]);
      },
      error: function(error) {
          console.log(error);
      }
    });

}

var candidate_onclick = function(e) {
    var move = game.move($(this).text());
    board.position(game.fen(), true);
    sendMove(move["from"], move["to"]);
  
}

$('#forward-btn').on('click', forward);
$('#backward-btn').on('click', backward);
