module StartScreen exposing (..)

import Encoders exposing (..)
import Html exposing (..)
import Html.Attributes exposing (..)
import Html.Events exposing (..)
import Types exposing (..)
import WebSocket
import Matrix exposing (Matrix
                       , Location
                       , square
                       , loc
                       , set
                       , row
                       , col)


type alias Model =
    { availableGames : List AvailableGame
    }


wss : String
wss =
  "ws://localhost:9001"

type alias MaybeGrid = Maybe (Matrix Int)

type Msg
    = AvailableGames (List AvailableGame)
    | JoinGame String MaybeGrid
    | CreateGame MaybeGrid

init : Model
init = Model []


availableGames : List AvailableGame -> Html Msg
availableGames = div [class "games"]
                 << List.map (\g ->
                                  div [class "av-game"]
                                  [
                                   button
                                       [onClick <| JoinGame g.id Nothing]
                                       [text "join this game"]
                                  ])


update : Msg -> Model -> (Model, Cmd Msg)
update msg model =
    case msg of
        CreateGame grid -> (model, Cmd.none)

        JoinGame gameId grid -> (model, Cmd.none)

        AvailableGames games ->
            ({model | availableGames = games}, Cmd.none)


view : Model -> Html Msg
view model =
    div []
        [
         button
             [class "new-game-button"
             ,onClick <| CreateGame Nothing]
             [text "create new game"]
        ,div [class "v-spacer"] []
        ,availableGames model.availableGames
        ]
