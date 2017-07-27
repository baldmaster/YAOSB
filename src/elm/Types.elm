module Types exposing (..)
import Matrix exposing (Matrix)

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


type GameStatus = Undefined
                | New
                | Joined
                | Win
                | Lose

type GameData
    = Create String
    | Join  JoinData
    | Start StartData
    | Turn TurnData
    | Hit TurnData
    | AvGames (List AvailableGame)
    | GameError ErrorData
