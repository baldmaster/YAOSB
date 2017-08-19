import Html exposing (..)
import Html.Attributes exposing (..)
import Html.Events exposing (..)
import Json.Decode as JD exposing (..)
import WebSocket

import StartScreen as SS
import Types exposing (..)
import Encoders exposing (..)
import Decoders exposing (..)
import Matrix exposing (Matrix
                       , Location
                       , square
                       , loc
                       , set
                       , row
                       , col)


main : Program Never Model Msg
main =
  Html.program
    { init = init
    , view = view
    , update = update
    , subscriptions = subscriptions
    }

wss : String
wss =
  "ws://localhost:9001"

emptyGrid : Matrix Int
emptyGrid = square 10 (\_ -> 0)


decodeMessage : String -> Result String GameData
decodeMessage = decodeString
                << andThen getDecoder
                    <| field "method" JD.string

-- MODEL


type alias Model =
  { gameId : String
  , playerGrid : Matrix Int
  , opponentGrid : Matrix Int
  , startScreenModel : SS.Model
  , gameStatus : GameStatus }

init : (Model, Cmd Msg)
init =
    (Model "" emptyGrid emptyGrid SS.init Undefined, Cmd.none)

-- UPDATE

type Msg
    = StartScreenMsg SS.Msg
    | NewTurn Location
    | NewMessage String
    | CancelNewGame
    | PlayAgain


gameDataHandler : Model -> GameData -> (Model, Cmd Msg)
gameDataHandler model gameData =
     case gameData of
         Create id ->
             ({model
                  | gameId = id
                  , gameStatus = New}
             , Cmd.none)

         Join  data ->
             ({model
                  | gameId = data.gameId
                  , playerGrid = data.grid
                  , gameStatus = Joined}
             , Cmd.none)

         Start data ->
             ({model
                  | playerGrid = data.grid
                  , gameStatus = Joined}
             , Cmd.none)

         Hit data ->
             let val = if data.hit == True then 2 else 3
                 g = set (loc data.x data.y) val model.playerGrid
                 gs = case data.win of
                          Just True ->  Lose
                          _ ->  model.gameStatus

             in ({model
                     | playerGrid = g
                     , gameStatus = gs}
                , Cmd.none)

         Turn  data ->
             let val = if data.hit == True then 1 else 2
                 g = set (loc data.x data.y) val model.opponentGrid
                 gs = case data.win of
                          Just True -> Win
                          _ ->  model.gameStatus

             in ({model
                     | opponentGrid = g
                     , gameStatus = gs}
                , Cmd.none)

         AvGames games ->
             let ( updatedStartScreenModel, startScreenCmd ) =
                     SS.update
                         (SS.AvailableGames games)
                             model.startScreenModel
             in ({model | startScreenModel  = updatedStartScreenModel}
                , Cmd.map StartScreenMsg startScreenCmd )

         GameError e -> (model, Cmd.none) -- TODO

update : Msg -> Model -> (Model, Cmd Msg)
update msg model =
  case msg of
      StartScreenMsg (SS.CreateGame grid) ->
          let message = encodeCreateMessage grid
          in (model, WebSocket.send wss message)


      StartScreenMsg (SS.JoinGame gameId grid) ->
          let message = encodeJoinMessage gameId grid
          in (model, WebSocket.send wss message)

      StartScreenMsg _ ->
          Debug.log "got message" ({model | gameStatus = Undefined}, Cmd.none)

      CancelNewGame ->
          ({model | gameStatus = Undefined}, Cmd.none) -- TODO: delete new game on server

      PlayAgain ->
          ({model | gameStatus = Undefined}, Cmd.none)

      NewTurn location ->
          let message = encodeTurnMessage model.gameId location
          in  (model, WebSocket.send wss message)

      NewMessage str ->
          case decodeString (field "success" JD.bool) str of
              Ok False ->  (model, Cmd.none) -- TODO: handle errors
              Ok True  ->
                  let data = decodeMessage str
                  in case data of
                         Ok gameData -> gameDataHandler model gameData
                         Err e -> Debug.log e (model, Cmd.none) -- TODO
              Err e -> Debug.log e (model, Cmd.none) -- TODO


-- SUBSCRIPTIONS


subscriptions : Model -> Sub Msg
subscriptions model =
  WebSocket.listen wss NewMessage


-- VIEW
locationToDiv : Matrix.Location -> Int -> Html Msg
locationToDiv location element =
    div [class "cell"
        ,case element of
              1 -> class "occupied-cell"
              2 -> class "hit-cell"
              3 -> class "missed-cell"
              _ -> class "empty-cell" ]
    []

opponentLocationToDiv : Matrix.Location -> Int -> Html Msg
opponentLocationToDiv location element =
    div [class "cell"
        , case element of
              1 -> class "hit-cell"
              2 -> class "missed-cell"
              _ -> class "empty-cell"
        , onClick <| NewTurn location]
    []


gameView : Model -> List (Html Msg)
gameView model =
    case model.gameStatus of
        Undefined ->
            [Html.map StartScreenMsg (SS.view model.startScreenModel) ]
        New ->
            [
             div [class "gridBox"]
                 <| List.map(\row -> div [class "row"] row)
                 <| Matrix.toList
                 <| Matrix.mapWithLocation locationToDiv model.playerGrid
            ,div [class "gridBox"
                 ,class "wo"] [
                  span
                      [class "wo-message"]
                      [text "Waiting for opponent to join..."]
                 ,button
                      [class "cancel-ng"
                      ,onClick CancelNewGame]
                      [text "cancel"]
                 ]
            ]

        Joined ->
            [
             div [class "gridBox"]
                 <| List.map(\row -> div [class "row"] row)
                 <| Matrix.toList
                 <| Matrix.mapWithLocation locationToDiv model.playerGrid
            ,div [class "gridBox"]
                <| List.map(\row -> div [class "row"] row)
                <| Matrix.toList
                <| Matrix.mapWithLocation
                    opponentLocationToDiv model.opponentGrid
            ]
        _ ->
            [
             span [] [text "Game over"]
            ,span [] [text <| if model.gameStatus == Win then
                                  "You win!"
                              else  "Opponent win!"
                     ]
            ,button [onClick PlayAgain] [text "play again"]
            ]

view : Model -> Html Msg
view model =
    div [class "wrapper"] [
         h3 [class "welcome"] [text "SEABATTLE"]
         , div []
             <| gameView model
        ]
