module Game exposing(..)

import Html exposing (..)
import Html.Attributes exposing (..)
import Html.Events exposing (..)

import StartScreen as SS
import Types exposing (..)
import Matrix exposing (Matrix
                       , Location
                       , square
                       , loc
                       , set
                       , row
                       , col)

emptyGrid : Matrix Int
emptyGrid = square 10 (\_ -> 0)

type alias Model =
  { gameId : String
  , playerGrid : Matrix Int
  , opponentGrid : Matrix Int
  , startScreenModel : SS.Model
  , gameStatus : GameStatus
  , error: Maybe ErrorData
  }

init : Model
init =
    { gameId = ""
    , playerGrid = emptyGrid
    , opponentGrid = emptyGrid
    , startScreenModel = SS.init
    , gameStatus = StartScreen
    , error = Nothing
    }

type Msg
    = StartScreenMsg SS.Msg
    | NewTurn Location
    | NewData GameData
    | CancelNewGame
    | PlayAgain
    | DismissAlert

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
                  , gameStatus = Game}
             , Cmd.none)

         Start data ->
             ({model
                  | playerGrid = data.grid
                  , gameStatus = Game}
             , Cmd.none)

         Hit data ->
             let
                 cellValue =
                     if data.hit == True then
                         2
                     else
                         3

                 grid = set (loc data.x data.y) cellValue model.playerGrid

                 newGameStatus =
                     case data.win of
                         Just True ->  Lose
                         _ ->  model.gameStatus

             in
                 ({model
                     | playerGrid = grid
                     , gameStatus = newGameStatus}
                , Cmd.none)

         Turn  data ->
             let
                 cellValue =
                     if data.hit == True then
                         1
                     else
                         2

                 grid = set (loc data.x data.y) cellValue model.opponentGrid

                 newGameStatus  =
                     case data.win of
                         Just True -> Win
                         _ ->  model.gameStatus

             in
                 ({model
                      | opponentGrid = grid
                      , gameStatus = newGameStatus}
                 , Cmd.none)

         AvGames games ->
             let
                 ( updatedStartScreenModel, startScreenCmd ) =
                     SS.update
                         (SS.AvailableGames games)
                             model.startScreenModel
             in
                 ({model | startScreenModel  = updatedStartScreenModel}
                 , Cmd.map StartScreenMsg startScreenCmd )

         GameError e ->
             ({model | error = Just e}, Cmd.none) -- TODO

update : Msg -> Model -> (Model, Cmd Msg)
update msg model =
  case msg of
      StartScreenMsg _ ->
          ({model | gameStatus = StartScreen}, Cmd.none)

      CancelNewGame ->
          ({model
               | gameId = ""
               , gameStatus = StartScreen}, Cmd.none) -- TODO: delete new game on server

      PlayAgain ->
          ({model | gameStatus = StartScreen}, Cmd.none)

      NewTurn location ->
          (model, Cmd.none)

      NewData gameData ->
          gameDataHandler model gameData

      DismissAlert ->
          ({model | error = Nothing}, Cmd.none)


locationToDiv : Matrix.Location -> Int -> Html Msg
locationToDiv location element =
    div [ class "cell"
        , case element of
              1 -> class "occupied-cell"
              2 -> class "hit-cell"
              3 -> class "missed-cell"
              _ -> class "empty-cell" ]
    []

opponentLocationToDiv : Matrix.Location -> Int -> Html Msg
opponentLocationToDiv location element =
    div [ class "cell"
        , case element of
              1 -> class "hit-cell"
              2 -> class "missed-cell"
              _ -> class "empty-cell"
        , onClick <| NewTurn location]
    []


gameView : Model -> List (Html Msg)
gameView model =
    case model.gameStatus of
        StartScreen ->
            [ Html.map StartScreenMsg (SS.view model.startScreenModel) ]

        New ->
            [
             div [ class "gridBox"]
                 <| List.map(\row -> div [class "row"] row)
                 <| Matrix.toList
                 <| Matrix.mapWithLocation locationToDiv model.playerGrid
            ,div [ class "gridBox"
                 , class "wo"]
                 [
                  span [ class "wo-message" ]
                      [ text "Waiting for opponent to join..." ]
                 ,button
                      [ class "cancel-ng"
                      , onClick CancelNewGame]
                      [ text "cancel" ]
                 ]
            ]

        Game ->
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
             span [] [text "Game over. "]
            ,span [] [text <| if model.gameStatus == Win then
                                  "You win!"
                              else  "Opponent win!"
                     ]
            ,button [onClick PlayAgain] [text "play again"]
            ]

alertView : Maybe ErrorData -> Html Msg
alertView error =
    case error of
        Just e ->
            div [class "alert" ]
                [ h4 [] [text <| e.method ++ "ERROR" ]
                , p [] [ text e.message]
                , button [ onClick <| DismissAlert ]
                    [ text "close" ]
                ]

        Nothing -> text ""

view : Model -> Html Msg
view model =
    div []
        [ alertView model.error
        , div [] <| gameView model
        ]
