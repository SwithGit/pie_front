import React, { useState, useEffect } from "react";
import Sidebar from "../Sidebar/Sidebar";
import * as S from "./Points.style";
import Button from "../../../common/Button/Button";
import PointModal from "../../../modal/PointModal/PointModal";
import { userPoints } from "../../../../api/api"; // API 함수 임포트
const Points: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [points, setPoints] = useState<number>(0); // 포인트 데이터를 저장할 상태
  const fetchPoints = async () => {
    try {
      const data = await userPoints(); // API 호출
      setPoints(data.response.points); // 포인트 데이터를 상태에 저장
    } catch (error) {
      console.error("포인트 데이터를 가져오는 중 오류 발생:", error);
    }
  };

  useEffect(() => {
    fetchPoints(); // 컴포넌트 마운트 시 API 호출
  }, []);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <S.Container>
      <Sidebar />
      <S.MainContent>
        <S.Title>포인트</S.Title>
        <S.PointsContainerDetail>
          <S.Label>현재 보유중인 포인트</S.Label>
          <S.LabelSecond>{points} point</S.LabelSecond>
        </S.PointsContainerDetail>
        <S.ButtonWrapper>
          <Button text="포인트 충전" onClick={openModal} />
        </S.ButtonWrapper>
        <S.Form>
          <S.HistoryForm>
            <S.Title>포인트 사용내역</S.Title>
            <p style={{ color: "#75808a", lineHeight: 1.8, padding: "24px 0" }}>포인트 사용내역 조회는 준비 중입니다.</p>
          </S.HistoryForm>
        </S.Form>
      </S.MainContent>
      {isModalOpen && <PointModal onClose={closeModal} />}
    </S.Container>
  );
};

export default Points;
