module Encoders exposing (..)
import Matrix exposing (Matrix
                       ,Location
                       ,toList
                       ,row
                       ,col)
import Json.Encode exposing (Value
                            ,encode
                            ,object
                            ,list
                            ,null
                            ,int
                            ,string)
import Types

encodeMatrix : Matrix Int -> Value
encodeMatrix m = list
                 <| List.map (list  << List.map int)
                 <| toList m

encodeCreateMessage : Maybe (Matrix Int) -> String
encodeCreateMessage grid =
    encode 0
        <| object [
             ("method", string "create")
            ,("grid", case grid of
                          Just g -> encodeMatrix g
                          _ ->  null)
            ]

encodeTurnMessage : String -> Location -> String
encodeTurnMessage gameId location =
    encode 0
        <| object [
             ("method", string "turn")
            ,("gameId", string gameId)
            ,("x", int (row location))
            ,("y", int (col location))
            ]


encodeJoinMessage : String -> Maybe (Matrix Int) -> String
encodeJoinMessage gameId grid =
    encode 0
        <| object [
             ("method", string "join")
            ,("gameId", string gameId)
            ,("grid",   case grid of
                            Just g -> encodeMatrix g
                            _ ->  null)
            ]
