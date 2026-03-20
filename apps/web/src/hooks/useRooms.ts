import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { roomsApi } from '@/services/rooms';
import { useChatStore } from '@/store/chatStore';
import { joinRoom } from '@/services/socket';

export function useRooms() {
  const setRooms = useChatStore((s) => s.setRooms);
  const queryClient = useQueryClient();
  const prevIdsRef = useRef('');

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: roomsApi.getAll,
    staleTime: 10_000,
    refetchOnWindowFocus: true,
  });

  // FIX: compare a stable string of room IDs instead of the rooms array reference.
  // rooms[] is a new object every render — using it as a dep causes infinite loop:
  // setRooms → Zustand state change → re-render → new rooms[] ref → effect fires → setRooms → repeat
  useEffect(() => {
    const ids = rooms.map((r) => r.id).join(',');
    if (ids === prevIdsRef.current) return; // nothing actually changed
    prevIdsRef.current = ids;

    setRooms(rooms);
    rooms.forEach((room) => joinRoom(room.id));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms]); // rooms ref changes when data changes — guarded by the ID comparison above

  const createDM = useMutation({
    mutationFn: roomsApi.createDM,
    onSuccess: (newRoom) => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      joinRoom(newRoom.id);
    },
  });

  const createGroup = useMutation({
    mutationFn: roomsApi.createGroup,
    onSuccess: (newRoom) => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      joinRoom(newRoom.id);
    },
  });

  const leaveRoom = useMutation({
    mutationFn: roomsApi.leave,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rooms'] }),
  });

  return { rooms, isLoading, createDM, createGroup, leaveRoom };
}
