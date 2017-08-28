import Html exposing (..)
import Html.Attributes exposing (..)
import Json.Decode as JD exposing (..)
import WebSocket

import Game as G
import StartScreen as SS
import Types exposing (..)
import Encoders exposing (..)
import Decoders exposing (..)


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

decodeMessage : String -> Result String GameData
decodeMessage = decodeString
                << andThen getDecoder
                    <| field "method" JD.string

-- MODEL


type alias Model =
  { gameModel : G.Model }

init : (Model, Cmd Msg)
init =
    (Model G.init, Cmd.none)

-- UPDATE

type Msg
    = GameMessage G.Msg
    | NewMessage String

gameMsgHandler : G.Msg -> Model -> (Model, Cmd Msg)
gameMsgHandler msg model =
    case msg of
        G.StartScreenMsg ssMsg ->
            case ssMsg of
                SS.CreateGame grid ->
                    let
                        message = encodeCreateMessage grid
                    in
                        (model, WebSocket.send wss message)

                SS.JoinGame gameId grid ->
                    let
                        message = encodeJoinMessage gameId grid
                    in
                        (model, WebSocket.send wss message)

                _ ->
                    let
                        (updatedGameModel, gameCmd) =
                            G.update msg model.gameModel
                    in
                        ({ model | gameModel = updatedGameModel}
                        , Cmd.map GameMessage gameCmd)

        G.CancelNewGame ->
            let
                (updatedGameModel, gameCmd) =
                    G.update G.CancelNewGame model.gameModel
                message = encodeCancelNewGameMessage model.gameModel.gameId
            in
                ({ model | gameModel = updatedGameModel}
                , WebSocket.send wss message)

        G.NewTurn location ->
            let
                message = encodeTurnMessage
                          model.gameModel.gameId
                              location
            in
                (model, WebSocket.send wss message)

        _ ->
            let
                (updatedGameModel, gameCmd) =
                    G.update msg model.gameModel
            in
                ({ model | gameModel = updatedGameModel}
                , Cmd.map GameMessage gameCmd)


update : Msg -> Model -> (Model, Cmd Msg)
update msg model =
  case msg of
      GameMessage m -> gameMsgHandler m model

      NewMessage str ->
          case decodeString (field "success" JD.bool) str of
              Ok False ->  (model, Cmd.none) -- TODO: handle errors

              Ok True  ->
                  let
                      data = decodeMessage str
                  in
                      case data of
                         Ok gameData ->
                             let
                                 (updatedGameModel, gameCmd) =
                                     G.update
                                         (G.NewData gameData)
                                             model.gameModel
                             in
                                 ({ model | gameModel = updatedGameModel}
                                  , Cmd.none)

                         Err e -> Debug.log e (model, Cmd.none) -- TODO

              Err e -> Debug.log e (model, Cmd.none) -- TODO


-- SUBSCRIPTIONS


subscriptions : Model -> Sub Msg
subscriptions model =
  WebSocket.listen wss NewMessage


-- VIEW
view : Model -> Html Msg
view model =
    div [class "wrapper"] [
         h3 [class "welcome"] [text "SEABATTLE"]
         , div []
             [ Html.map GameMessage (G.view model.gameModel) ]
        ]
