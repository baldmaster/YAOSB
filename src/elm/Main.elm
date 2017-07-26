import Html exposing (..)
import Html.Attributes exposing (..)
import Html.Events exposing (..)
import Json.Decode as JD exposing (..)
import Json.Encode as JE exposing (..)
import WebSocket
import Matrix exposing (Matrix
                       , Location
                       , square)


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



-- MODEL


type alias Model =
  { gameId : String
  , playerGrid : Matrix Int
  , opponentGrid : Matrix Int
  }


init : (Model, Cmd Msg)
init =
    (Model "" (square 10 (\_ -> 0)) (square 10 (\_ -> 0)), Cmd.none)


-- UPDATE


type Msg
    = CreateGame (Maybe (Matrix Int))
    | JoinGame (Maybe (Matrix Int))
    | NewTurn Location
    | NewMessage String


type alias JoinData = {info : String}
type alias ErrorData = {method : String
                       ,code : String
                       ,message : String}
type alias StartData = {move : Bool, grid : Matrix Int}
type alias TurnData  =  {x : Int
                        ,y : Int
                        ,hit : Bool
                        ,wrecked : Maybe Bool
                        ,size : Maybe Bool
                        ,win : Maybe Bool}

type GameData
    = Create String
    | Join  JoinData
    | Start StartData
    | Turn TurnData
    | GameError ErrorData

createDecoder : JD.Decoder GameData
createDecoder = JD.map Create (field "gameId" JD.string)

joinDecoder : JD.Decoder GameData
joinDecoder = JD.map JoinData
              (field "info" JD.string)
                  |> JD.map Join

errorDecoder : JD.Decoder GameData
errorDecoder = JD.map3 ErrorData
               (at ["method"] JD.string)
               (at ["error","code"] JD.string)
               (at ["error","message"] JD.string)
                   |> JD.map GameError

unknownMethodDecoder : JD.Decoder GameData
unknownMethodDecoder = JD.map3 ErrorData
                       (field "method" JD.string)
                       (succeed "UNKNOWN_METHOD")
                       (succeed "Unknown method")
                           |> JD.map GameError

turnDecoder : JD.Decoder GameData
turnDecoder = JD.map6 TurnData
              (field "x" JD.int)
              (field "y" JD.int)
              (field "hit" JD.bool)
              (JD.maybe <| field "wrecked" JD.bool)
              (JD.maybe <| field "size" JD.bool)
              (JD.maybe <| field "win" JD.bool)
                  |> JD.map Turn

startDecoder : JD.Decoder GameData
startDecoder = JD.map2 StartData
               (field "move" JD.bool)
               (field "grid" matrixDecoder)
                   |> JD.map Start

getDecoder : String -> JD.Decoder GameData
getDecoder method = case method of
                           "create" -> createDecoder
                           "join" -> joinDecoder
                           "turn" -> turnDecoder
                           "start" -> startDecoder
                           _       -> unknownMethodDecoder

matrixDecoder : JD.Decoder (Matrix Int)
matrixDecoder = JD.map Matrix.fromList <| JD.list <| JD.list JD.int


matrixToJson : Matrix Int -> JE.Value
matrixToJson m = JE.list
                 <| List.map (JE.list  << List.map JE.int)
                 <| Matrix.toList m

decodeMessage : String -> Result String GameData
decodeMessage = decodeString
                << andThen getDecoder
                    <| field "method" JD.string

update : Msg -> Model -> (Model, Cmd Msg)
update msg model =
  case msg of
    CreateGame grid ->
        let message = encode 0
                      <| JE.object [
                           ("method", JE.string "create")
                          ,("grid", case grid of
                                        Just g -> matrixToJson g
                                        _ ->  JE.null)
                          ]
        in (model, WebSocket.send wss message)
    JoinGame grid ->
        let message = encode 0
                      <| JE.object [
                           ("method", JE.string "join")
                          ,("gameId", JE.string model.gameId)
                          ,("grid",   case grid of
                                          Just g -> matrixToJson g
                                          _ ->   JE.null)
                          ]
        in (model, WebSocket.send wss message)

    NewTurn location ->
        let (x, y) = location
            message = encode 0
                      <| JE.object [
                           ("method", JE.string "turn")
                          ,("gameId", JE.string model.gameId)
                          ,("x", JE.int x)
                          ,("y", JE.int y)
                          ]
        in  (model, WebSocket.send wss message)
    NewMessage str ->
        case decodeString (field "success" JD.bool) str of
            Ok False ->  (model, Cmd.none)
            Ok True  ->
                let data = decodeMessage str
                in case data of
                       Ok gameData ->
                           case gameData of
                               Create id ->  ({model | gameId = id}, Cmd.none)
                               Join  data ->  (model, Cmd.none) -- TODO
                               Start data ->  ({model | playerGrid = data.grid}, Cmd.none)
                               Turn  data -> (model, Cmd.none) -- TODO
                               GameError e -> (model, Cmd.none) -- TODO
                       Err e ->  (model, Cmd.none)
            Err e ->  (model, Cmd.none)


-- SUBSCRIPTIONS


subscriptions : Model -> Sub Msg
subscriptions model =
  WebSocket.listen wss NewMessage



-- VIEW
locationToDiv : Matrix.Location -> a -> Html Msg
locationToDiv location element =
    div [class "cell"] []

opponentLocationToDiv : Matrix.Location -> a -> Html Msg
opponentLocationToDiv location element =
    div [class "cell", onClick <| NewTurn location] []

view : Model -> Html Msg
view model =
  div [] [
       div [class "gridBox"]
           <| List.map(\row -> div [class "row"] row)
           <| Matrix.toList
           <| Matrix.mapWithLocation locationToDiv model.playerGrid
      ,div [class "gridBox"]
           <| List.map(\row -> div [class "row"] row)
           <| Matrix.toList
           <| Matrix.mapWithLocation opponentLocationToDiv model.opponentGrid
      ]
