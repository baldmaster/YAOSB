module Decoders exposing (..)
import Matrix exposing (Matrix
                       ,Location
                       ,toList
                       ,row
                       ,col)
import Json.Decode exposing (Decoder
                            ,field
                            ,at
                            ,maybe
                            ,succeed
                            ,map
                            ,map2
                            ,map3
                            ,map4
                            ,map6
                            ,list
                            ,int
                            ,bool
                            ,string)
import Types exposing(..)

createDecoder : Decoder GameData
createDecoder = map Create (field "gameId" string)

availableGameDecoder : Decoder AvailableGame
availableGameDecoder = map2 AvailableGame
                       (field "_id" string)
                       (field "createdAt" int)

avGamesDecoder : Decoder GameData
avGamesDecoder = map AvGames
                 (field "games" (list availableGameDecoder))

joinDecoder : Decoder GameData
joinDecoder = map4 JoinData
              (field "gameId" string)
              (field "grid" matrixDecoder)
              (field "myTurn" bool)
              (field "info" string)
                  |> map Join

errorDecoder : Decoder GameData
errorDecoder = map3 ErrorData
               (at ["method"] string)
               (at ["error","code"] string)
               (at ["error","message"] string)
                   |> map GameError

unknownMethodDecoder : Decoder GameData
unknownMethodDecoder = map3 ErrorData
                       (field "method" string)
                       (succeed "UNKNOWN_METHOD")
                       (succeed "Unknown method")
                           |> map GameError

turnDecoder : Decoder GameData
turnDecoder = map6 TurnData
              (field "x" int)
              (field "y" int)
              (field "hit" bool)
              (maybe <| field "wrecked" bool)
              (maybe <| field "size" bool)
              (maybe <| field "win" bool)
                  |> map Turn


hitDecoder : Decoder GameData
hitDecoder = map6 TurnData
              (field "x" int)
              (field "y" int)
              (field "hit" bool)
              (maybe <| field "wrecked" bool)
              (maybe <| field "size" bool)
              (maybe <| field "win" bool)
                  |> map Hit

startDecoder : Decoder GameData
startDecoder = map2 StartData
               (field "myTurn" bool)
               (field "grid" matrixDecoder)
                   |> map Start

getDecoder : String -> Decoder GameData
getDecoder method = case method of
                           "create" -> createDecoder
                           "join" -> joinDecoder
                           "turn" -> turnDecoder
                           "hit"  -> hitDecoder
                           "start" -> startDecoder
                           "available games" -> avGamesDecoder
                           _       -> unknownMethodDecoder

matrixDecoder : Decoder (Matrix Int)
matrixDecoder = map Matrix.fromList <| list <| list int
