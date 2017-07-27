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


-- TYPES


-- MODEL


type alias Model =
  { gameId : String
  , playerGrid : Matrix Int
  , opponentGrid : Matrix Int
  , availableGames: List AvailableGame }

emptyGrid : Matrix Int
emptyGrid = square 10 (\_ -> 0)

init : (Model, Cmd Msg)
init =
    (Model "" emptyGrid emptyGrid [], Cmd.none)


-- UPDATE

type Msg
    = CreateGame (Maybe (Matrix Int))
    | JoinGame String (Maybe (Matrix Int))
    | NewTurn Location
    | NewMessage String

type alias AvailableGame = {id : String, createdAt : Int}

type alias JoinData = { gameId : String
                      , grid : Matrix Int
                      , myTurn: Bool
                      , info : String}
type alias ErrorData = {method : String
                       ,code : String
                       ,message : String}
type alias StartData = {myTurn : Bool,
                        grid : Matrix Int}
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
    | AvGames (List AvailableGame)
    | GameError ErrorData

createDecoder : JD.Decoder GameData
createDecoder = JD.map Create (field "gameId" JD.string)

availableGameDecoder : JD.Decoder AvailableGame
availableGameDecoder = JD.map2 AvailableGame
                       (field "_id" JD.string)
                       (field "createdAt" JD.int)

avGamesDecoder : JD.Decoder GameData
avGamesDecoder = JD.map AvGames
                 (field "games" (JD.list availableGameDecoder))

joinDecoder : JD.Decoder GameData
joinDecoder = JD.map4 JoinData
              (field "gameId" JD.string)
              (field "grid" matrixDecoder)
              (field "myTurn" JD.bool)
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
               (field "myTurn" JD.bool)
               (field "grid" matrixDecoder)
                   |> JD.map Start

getDecoder : String -> JD.Decoder GameData
getDecoder method = case method of
                           "create" -> createDecoder
                           "join" -> joinDecoder
                           "turn" -> turnDecoder
                           "start" -> startDecoder
                           "available games" -> Debug.log method avGamesDecoder
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
    JoinGame gameId grid ->
        let message = encode 0
                      <| JE.object [
                           ("method", JE.string "join")
                          ,("gameId", JE.string gameId)
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
                               Create id ->   ({model | gameId = id}, Cmd.none)
                               Join  data ->  ({model | gameId = data.gameId, playerGrid = data.grid}, Cmd.none)
                               Start data ->  ({model | playerGrid = data.grid}, Cmd.none)
                               Turn  data ->
                                   let val = if data.hit == True then 1 else 2
                                       oppGrid = Matrix.set (Matrix.loc data.x data.y) val model.opponentGrid
                                   in ({model | opponentGrid = oppGrid}, Cmd.none)
                               AvGames games -> ({model | availableGames = games}, Cmd.none)
                               GameError e -> (model, Cmd.none) -- TODO
                       Err e -> Debug.log e (model, Cmd.none)
            Err e -> Debug.log e (model, Cmd.none)


-- SUBSCRIPTIONS


subscriptions : Model -> Sub Msg
subscriptions model =
  WebSocket.listen wss NewMessage


-- VIEW
locationToDiv : Matrix.Location -> Int -> Html Msg
locationToDiv location element =
    div [class "cell"
        , if element == 1 then
              class "occupied-cell"
          else class "empty-cell"]
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

availableGames : List AvailableGame -> Html Msg
availableGames = div [class "games"]
                 << List.map (\g ->
                                  div [class "av-game"]
                                  [
                                   button [onClick <| JoinGame g.id Nothing]
                                       [text "join game"]
                                  ])

view : Model -> Html Msg
view model =
    if model.gameId == "" then
        div [] [
             button [onClick <| CreateGame Nothing] [text "new game"]
            ,availableGames model.availableGames
            ]
    else
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
